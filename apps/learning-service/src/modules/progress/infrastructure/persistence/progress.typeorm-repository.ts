import type { AcceptedSubmission } from '@learning/modules/progress/domain/accepted-submission';
import { ProblemProgress } from '@learning/modules/progress/domain/problem-progress';
import type { ProgressRepository } from '@learning/modules/progress/domain/repositories/progress-repository.port.out';
import { Progress, ProgressStatus } from '@learning/modules/progress/entities/progress.entity';
import { Injectable } from '@nestjs/common';

import { ProgressTransactionContext } from './progress-transaction-context';

@Injectable()
export class ProgressTypeOrmRepository implements ProgressRepository {
  constructor(private readonly context: ProgressTransactionContext) {}

  async recordReceipt(event: AcceptedSubmission): Promise<boolean> {
    const rows: unknown = await this.context.requireManager().query(
      `INSERT INTO progress_event_receipts (event_id, user_id, problem_id)
       VALUES ($1, $2, $3) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [event.eventId, event.userId, event.problemId],
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  async insertIfAbsent(progress: ProblemProgress): Promise<boolean> {
    const rows: unknown = await this.context.requireManager().query(
      `INSERT INTO progress (user_id, problem_id, status, best_score, solved_at, last_event_id)
       VALUES ($1, $2, 'SOLVED', $3, $4, $5)
       ON CONFLICT (user_id, problem_id) DO NOTHING RETURNING id`,
      [
        progress.userId,
        progress.problemId,
        progress.bestScore,
        progress.solvedAt,
        progress.lastEventId,
      ],
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  async loadForUpdate(userId: string, problemId: string): Promise<ProblemProgress | null> {
    const entity = await this.context
      .requireManager()
      .getRepository(Progress)
      .createQueryBuilder('progress')
      .where('progress.userId = :userId AND progress.problemId = :problemId', {
        userId,
        problemId,
      })
      .setLock('pessimistic_write')
      .getOne();
    if (!entity) return null;
    if (entity.status === ProgressStatus.Attempted) return null;
    if (entity.solvedAt === null) throw new Error('Solved progress has no solvedAt');
    return ProblemProgress.rehydrate({
      userId: entity.userId,
      problemId: entity.problemId,
      bestScore: entity.bestScore,
      solvedAt: entity.solvedAt,
      lastEventId: entity.lastEventId ?? '',
    });
  }

  async save(progress: ProblemProgress): Promise<void> {
    const result = await this.context.requireManager().getRepository(Progress).update(
      { userId: progress.userId, problemId: progress.problemId },
      {
        status: ProgressStatus.Solved,
        bestScore: progress.bestScore,
        solvedAt: progress.solvedAt,
        lastEventId: progress.lastEventId,
      },
    );
    if (result.affected !== 1) throw new Error('Progress disappeared during accepted submission');
  }
}
