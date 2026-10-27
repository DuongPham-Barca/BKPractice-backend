import type {
  SampleTestCase,
  TestCaseRepository,
} from '@learning/modules/problems/domain/repositories/test-case.repository.port.out';
import type { TestCase } from '@learning/modules/problems/domain/test-case.aggregate';
import { Injectable } from '@nestjs/common';

import { TestCasePersistenceMapper, type TestCaseRow } from './test-case.persistence-mapper';
import { TypeOrmTransactionContext } from './typeorm-transaction-context';

const TEST_CASE_SELECT = `
  SELECT
    "id",
    "problem_id" AS "problemId",
    "input",
    "expected_output" AS "expectedOutput",
    "is_hidden" AS "isHidden",
    "score",
    "display_order" AS "displayOrder"
  FROM "test_cases"
`;

@Injectable()
export class TestCaseTypeOrmRepository implements TestCaseRepository {
  constructor(
    private readonly transactionContext: TypeOrmTransactionContext,
    private readonly mapper: TestCasePersistenceMapper,
  ) {}

  async findById(problemId: string, testCaseId: string): Promise<TestCase | null> {
    const rows = await this.transactionContext
      .getManager()
      .query<TestCaseRow[]>(`${TEST_CASE_SELECT} WHERE "problem_id" = $1 AND "id" = $2`, [
        problemId,
        testCaseId,
      ]);

    return rows[0] === undefined ? null : this.mapper.toDomain(rows[0]);
  }

  async listByProblem(problemId: string): Promise<TestCase[]> {
    const rows = await this.transactionContext
      .getManager()
      .query<TestCaseRow[]>(
        `${TEST_CASE_SELECT} WHERE "problem_id" = $1 ORDER BY "display_order" ASC, "id" ASC`,
        [problemId],
      );

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async listSamples(problemId: string): Promise<readonly SampleTestCase[]> {
    const rows = await this.transactionContext.getManager().query<SampleTestCase[]>(
      `SELECT
         "input",
         "expected_output" AS "expectedOutput",
         "display_order" AS "displayOrder"
       FROM "test_cases"
       WHERE "problem_id" = $1 AND "is_hidden" = FALSE
       ORDER BY "display_order" ASC, "id" ASC`,
      [problemId],
    );

    return rows;
  }

  async listForJudge(problemId: string): Promise<TestCase[]> {
    const rows = await this.transactionContext
      .getManager()
      .query<TestCaseRow[]>(
        `${TEST_CASE_SELECT} WHERE "problem_id" = $1 ORDER BY "display_order" ASC, "id" ASC`,
        [problemId],
      );

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async add(testCase: TestCase): Promise<void> {
    const snapshot = testCase.toSnapshot();

    await this.transactionContext.requireManager().query(
      `INSERT INTO "test_cases"
         ("id", "problem_id", "input", "expected_output", "is_hidden", "score", "display_order")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        snapshot.id,
        snapshot.problemId,
        snapshot.input,
        snapshot.expectedOutput,
        snapshot.visibility === 'HIDDEN',
        snapshot.score,
        snapshot.displayOrder,
      ],
    );
  }

  async update(testCase: TestCase): Promise<void> {
    const snapshot = testCase.toSnapshot();

    await this.transactionContext.requireManager().query(
      `UPDATE "test_cases"
       SET "input" = $3,
           "expected_output" = $4,
           "is_hidden" = $5,
           "score" = $6
       WHERE "id" = $1 AND "problem_id" = $2`,
      [
        snapshot.id,
        snapshot.problemId,
        snapshot.input,
        snapshot.expectedOutput,
        snapshot.visibility === 'HIDDEN',
        snapshot.score,
      ],
    );
  }

  async remove(problemId: string, testCaseId: string): Promise<boolean> {
    const rows = await this.transactionContext.requireManager().query<{ id: string }[]>(
      `DELETE FROM "test_cases"
       WHERE "id" = $1 AND "problem_id" = $2
       RETURNING "id"`,
      [testCaseId, problemId],
    );

    return rows.length === 1;
  }

  async reorder(problemId: string, orderedIds: readonly string[]): Promise<void> {
    await this.transactionContext.requireManager().query(
      `UPDATE "test_cases" AS "testCase"
       SET "display_order" = "ordered"."position" - 1
       FROM unnest($2::uuid[]) WITH ORDINALITY AS "ordered"("id", "position")
       WHERE "testCase"."id" = "ordered"."id"
         AND "testCase"."problem_id" = $1`,
      [problemId, orderedIds],
    );
  }
}
