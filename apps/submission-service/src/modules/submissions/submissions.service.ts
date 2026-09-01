import { randomUUID } from 'node:crypto';

import { RabbitMqService } from '@app/common';
import { RABBIT_EXCHANGES, RABBIT_ROUTING_KEYS } from '@app/contracts';
import type { JudgeRequest } from '@app/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { CreateSubmissionDto } from './dto/create-submission.dto';
import type { RunCodeDto } from './dto/run-code.dto';
import { Submission, SubmissionKind, SubmissionStatus } from './entities/submission.entity';
import { LearningJudgeClient } from './learning-judge.client';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission) private readonly submissions: Repository<Submission>,
    private readonly learning: LearningJudgeClient,
    private readonly rabbit: RabbitMqService,
  ) {}

  async submit(userId: string, dto: CreateSubmissionDto): Promise<Submission> {
    const judgePackage = await this.learning.getPackage(dto.problemId, dto.language);
    const submission = await this.submissions.save(
      this.submissions.create({
        userId,
        problemId: dto.problemId,
        language: dto.language,
        sourceCode: dto.sourceCode,
        kind: SubmissionKind.Submit,
        status: SubmissionStatus.Queued,
      }),
    );
    const request: JudgeRequest = {
      executionId: randomUUID(),
      submissionId: submission.id,
      mode: 'SUBMIT',
      language: dto.language,
      sourceCode: dto.sourceCode,
      ...judgePackage,
    };
    await this.publishOrFail(submission, request);
    return submission;
  }

  async run(userId: string, dto: RunCodeDto): Promise<Submission> {
    const submission = await this.submissions.save(
      this.submissions.create({
        userId,
        problemId: dto.problemId ?? null,
        language: dto.language,
        sourceCode: dto.sourceCode,
        kind: SubmissionKind.Run,
        status: SubmissionStatus.Queued,
      }),
    );
    const request: JudgeRequest = {
      executionId: randomUUID(),
      submissionId: submission.id,
      mode: 'RUN',
      problemId: dto.problemId,
      problemType: 'STANDARD',
      language: dto.language,
      sourceCode: dto.sourceCode,
      testCases: [{ stdin: dto.stdin }],
      timeLimitMs: 3_000,
      memoryLimitMb: 256,
    };
    await this.publishOrFail(submission, request);
    return submission;
  }

  list(userId: string): Promise<Submission[]> {
    return this.submissions.find({
      where: { userId },
      relations: { result: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async get(userId: string, id: string): Promise<Submission> {
    const submission = await this.submissions.findOne({
      where: { id, userId },
      relations: { result: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  private async publishOrFail(submission: Submission, request: JudgeRequest): Promise<void> {
    try {
      await this.rabbit.publish(RABBIT_EXCHANGES.judge, RABBIT_ROUTING_KEYS.judgeRequest, request, {
        messageId: request.executionId,
      });
    } catch (error: unknown) {
      await this.submissions.update(submission.id, { status: SubmissionStatus.InternalError });
      throw error;
    }
  }
}
