import type { SupportedLanguage } from '@app/contracts';
import { Harness, type HarnessSnapshot } from '@learning/modules/problems/domain/harness.aggregate';
import type { HarnessRepository } from '@learning/modules/problems/domain/repositories/harness.repository.port.out';
import { Injectable } from '@nestjs/common';

import { TypeOrmTransactionContext } from './typeorm-transaction-context';

@Injectable()
export class HarnessTypeOrmRepository implements HarnessRepository {
  constructor(private readonly transactionContext: TypeOrmTransactionContext) {}

  async find(problemId: string, language: SupportedLanguage): Promise<Harness | null> {
    const rows = await this.transactionContext.getManager().query<HarnessSnapshot[]>(
      `SELECT
         "problem_id" AS "problemId",
         "language",
         "source"
       FROM "problem_harnesses"
       WHERE "problem_id" = $1 AND "language" = $2`,
      [problemId, language],
    );

    return rows[0] === undefined ? null : Harness.rehydrate(rows[0]);
  }

  async upsert(harness: Harness): Promise<void> {
    const snapshot = harness.toSnapshot();

    await this.transactionContext.requireManager().query(
      `INSERT INTO "problem_harnesses" ("problem_id", "language", "source")
       VALUES ($1, $2, $3)
       ON CONFLICT ("problem_id", "language")
       DO UPDATE SET "source" = EXCLUDED."source", "updated_at" = now()`,
      [snapshot.problemId, snapshot.language, snapshot.source],
    );
  }

  async remove(problemId: string, language: SupportedLanguage): Promise<boolean> {
    const rows = await this.transactionContext.requireManager().query<{ id: string }[]>(
      `DELETE FROM "problem_harnesses"
       WHERE "problem_id" = $1 AND "language" = $2
       RETURNING "id"`,
      [problemId, language],
    );

    return rows.length === 1;
  }
}
