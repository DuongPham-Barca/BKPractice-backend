import { TestCase } from '@learning/modules/problems/domain/test-case.aggregate';
import { Injectable } from '@nestjs/common';

export interface TestCaseRow {
  readonly id: string;
  readonly problemId: string;
  readonly input: string;
  readonly expectedOutput: string;
  readonly isHidden: boolean;
  readonly score: number;
  readonly displayOrder: number;
}

@Injectable()
export class TestCasePersistenceMapper {
  toDomain(row: TestCaseRow): TestCase {
    return TestCase.rehydrate({
      id: row.id,
      problemId: row.problemId,
      input: row.input,
      expectedOutput: row.expectedOutput,
      visibility: row.isHidden ? 'HIDDEN' : 'SAMPLE',
      score: row.score,
      displayOrder: row.displayOrder,
    });
  }
}
