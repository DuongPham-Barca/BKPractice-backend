import { randomUUID } from 'node:crypto';

import { RabbitMqService } from '@app/common';
import { RABBIT_EXCHANGES, RABBIT_ROUTING_KEYS } from '@app/contracts';
import type { JudgeRequest, SupportedLanguage } from '@app/contracts';
import { Injectable } from '@nestjs/common';

import type { JudgeJobPort, RunJudgeJob, SubmitJudgeJob } from '../../domain/ports/judge-job.port';
import { SubmissionKind } from '../../domain/submission-record';

@Injectable()
export class RabbitJudgeJobAdapter implements JudgeJobPort {
  constructor(private readonly rabbit: RabbitMqService) {}

  async publish(job: RunJudgeJob | SubmitJudgeJob): Promise<void> {
    const request = job.kind === SubmissionKind.Run ? toRunRequest(job) : toSubmitRequest(job);
    await this.rabbit.publish(RABBIT_EXCHANGES.judge, RABBIT_ROUTING_KEYS.judgeRequest, request, {
      messageId: request.executionId,
    });
  }
}

function toRunRequest(job: RunJudgeJob): JudgeRequest {
  return {
    executionId: randomUUID(),
    submissionId: job.submissionId,
    mode: 'RUN',
    problemType: 'STANDARD',
    language: job.language as SupportedLanguage,
    sourceCode: job.sourceCode,
    testCases: [{ stdin: job.stdin }],
    timeLimitMs: job.timeLimitMs,
    memoryLimitMb: job.memoryLimitMb,
  };
}

function toSubmitRequest(job: SubmitJudgeJob): JudgeRequest {
  const { judgePackage } = job;
  return {
    executionId: randomUUID(),
    submissionId: job.submissionId,
    mode: 'SUBMIT',
    problemId: job.problemId,
    problemType: judgePackage.problemType,
    language: job.language as SupportedLanguage,
    sourceCode: job.sourceCode,
    testCases: [...judgePackage.testCases],
    hiddenHarness: judgePackage.hiddenHarness,
    timeLimitMs: judgePackage.timeLimitMs,
    memoryLimitMb: judgePackage.memoryLimitMb,
  };
}
