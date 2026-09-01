import { chmod, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { JudgeRequest, JudgeResult, JudgeStatus } from '@app/contracts';
import { normalizeJudgeOutput } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { parseCompilerError } from './compiler-error.parser';
import { RunnerRegistry } from './runners/runner.registry';
import { DockerSandboxExecutor } from './sandbox/docker-sandbox.executor';

@Injectable()
export class JudgeEngine {
  constructor(
    private readonly runners: RunnerRegistry,
    private readonly sandbox: DockerSandboxExecutor,
    private readonly config: ConfigService,
  ) {}

  async judge(request: JudgeRequest): Promise<JudgeResult> {
    const root = resolve(this.config.getOrThrow<string>('JUDGE_WORKSPACE_ROOT'));
    await mkdir(root, { recursive: true, mode: 0o700 });
    const workspace = await mkdtemp(join(root, `${request.executionId}-`));
    await chmod(workspace, 0o777);
    try {
      const runner = this.runners.get(request.language);
      const source = request.hiddenHarness
        ? `${request.sourceCode}\n\n${request.hiddenHarness}`
        : request.sourceCode;
      await writeFile(join(workspace, runner.sourceFile), source, {
        encoding: 'utf8',
        mode: 0o666,
      });

      if (runner.compileCommand) {
        const compilation = await this.sandbox.execute({
          executionId: `${request.executionId}-compile`,
          workspace,
          image: runner.image,
          command: runner.compileCommand,
          stdin: '',
          timeoutMs: Math.max(request.timeLimitMs * 3, 10_000),
          memoryLimitMb: request.memoryLimitMb,
        });
        if (compilation.exitCode !== 0) {
          const output = `${compilation.stdout}${compilation.stderr}`;
          return {
            executionId: request.executionId,
            submissionId: request.submissionId,
            mode: request.mode,
            status: compilation.timedOut ? 'TIME_LIMIT_EXCEEDED' : 'COMPILE_ERROR',
            compileOutput: output,
            error: parseCompilerError(output),
          };
        }
      }

      let passedTests = 0;
      let score = 0;
      let totalRuntimeMs = 0;
      let lastStdout = '';
      let lastStderr = '';
      for (const testCase of request.testCases) {
        const execution = await this.sandbox.execute({
          executionId: `${request.executionId}-${passedTests}`,
          workspace,
          image: runner.image,
          command: runner.executeCommand,
          stdin: testCase.stdin,
          timeoutMs: request.timeLimitMs,
          memoryLimitMb: request.memoryLimitMb,
        });
        totalRuntimeMs += execution.runtimeMs;
        lastStdout = execution.stdout;
        lastStderr = execution.stderr;
        const errorStatus = this.executionErrorStatus(execution);
        if (errorStatus) {
          return this.result(
            request,
            errorStatus,
            passedTests,
            score,
            totalRuntimeMs,
            lastStdout,
            lastStderr,
          );
        }
        if (
          testCase.expectedOutput !== undefined &&
          normalizeJudgeOutput(execution.stdout) !== normalizeJudgeOutput(testCase.expectedOutput)
        ) {
          return this.result(
            request,
            'WRONG_ANSWER',
            passedTests,
            score,
            totalRuntimeMs,
            lastStdout,
            lastStderr,
          );
        }
        passedTests += 1;
        score += testCase.score ?? 0;
      }
      return this.result(
        request,
        'ACCEPTED',
        passedTests,
        score || 100,
        totalRuntimeMs,
        lastStdout,
        lastStderr,
      );
    } catch (error: unknown) {
      return {
        executionId: request.executionId,
        submissionId: request.submissionId,
        mode: request.mode,
        status: 'INTERNAL_ERROR',
        stderr: error instanceof Error ? error.message : 'Unknown judge error',
      };
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }

  private executionErrorStatus(result: {
    timedOut: boolean;
    outputLimitExceeded: boolean;
    exitCode: number;
  }): JudgeStatus | undefined {
    if (result.timedOut) return 'TIME_LIMIT_EXCEEDED';
    if (result.outputLimitExceeded) return 'RUNTIME_ERROR';
    if (result.exitCode === 137) return 'MEMORY_LIMIT_EXCEEDED';
    if (result.exitCode !== 0) return 'RUNTIME_ERROR';
    return undefined;
  }

  private result(
    request: JudgeRequest,
    status: JudgeStatus,
    passedTests: number,
    score: number,
    runtimeMs: number,
    stdout: string,
    stderr: string,
  ): JudgeResult {
    return {
      executionId: request.executionId,
      submissionId: request.submissionId,
      mode: request.mode,
      status,
      passedTests,
      totalTests: request.testCases.length,
      score,
      runtimeMs,
      stdout,
      stderr,
    };
  }
}
