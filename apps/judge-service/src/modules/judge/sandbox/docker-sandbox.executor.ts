import { spawn } from 'node:child_process';
import { basename, join } from 'node:path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SandboxResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  runtimeMs: number;
  timedOut: boolean;
  outputLimitExceeded: boolean;
}

interface SandboxOptions {
  executionId: string;
  workspace: string;
  image: string;
  command: readonly string[];
  stdin: string;
  timeoutMs: number;
  memoryLimitMb: number;
}

@Injectable()
export class DockerSandboxExecutor {
  constructor(private readonly config: ConfigService) {}

  execute(options: SandboxOptions): Promise<SandboxResult> {
    const binary = this.config.getOrThrow<string>('JUDGE_DOCKER_BINARY');
    const maxOutput = this.config.getOrThrow<number>('JUDGE_MAX_OUTPUT_BYTES');
    const dockerWorkspaceRoot = this.config.get<string>('JUDGE_DOCKER_WORKSPACE_ROOT');
    const dockerWorkspace = dockerWorkspaceRoot
      ? join(dockerWorkspaceRoot, basename(options.workspace))
      : options.workspace;
    const containerName = `bkpractice-${options.executionId.replace(/[^a-zA-Z0-9_.-]/g, '')}`;
    const args = [
      'run',
      '--rm',
      '--name',
      containerName,
      '--network',
      'none',
      '--cpus',
      '1',
      '--memory',
      `${options.memoryLimitMb}m`,
      '--memory-swap',
      `${options.memoryLimitMb}m`,
      '--pids-limit',
      '64',
      '--user',
      '1000:1000',
      '--cap-drop',
      'ALL',
      '--security-opt',
      'no-new-privileges',
      '--read-only',
      '--tmpfs',
      '/tmp:rw,noexec,nosuid,size=64m',
      '--volume',
      `${dockerWorkspace}:/workspace:rw`,
      '--workdir',
      '/workspace',
      options.image,
      ...options.command,
    ];

    return new Promise((resolve, reject) => {
      const startedAt = performance.now();
      const child = spawn(binary, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let bytes = 0;
      let timedOut = false;
      let outputLimitExceeded = false;

      const stop = (): void => {
        child.kill('SIGKILL');
        const killer = spawn(binary, ['kill', containerName], { stdio: 'ignore' });
        killer.unref();
      };
      const timeout = setTimeout(() => {
        timedOut = true;
        stop();
      }, options.timeoutMs);

      const capture =
        (target: Buffer[]) =>
        (chunk: Buffer): void => {
          bytes += chunk.length;
          if (bytes <= maxOutput) target.push(chunk);
          else if (!outputLimitExceeded) {
            outputLimitExceeded = true;
            stop();
          }
        };
      child.stdout.on('data', capture(stdout));
      child.stderr.on('data', capture(stderr));
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          exitCode: code ?? -1,
          stdout: Buffer.concat(stdout).toString('utf8'),
          stderr: Buffer.concat(stderr).toString('utf8'),
          runtimeMs: Math.ceil(performance.now() - startedAt),
          timedOut,
          outputLimitExceeded,
        });
      });
      child.stdin.end(options.stdin);
    });
  }
}
