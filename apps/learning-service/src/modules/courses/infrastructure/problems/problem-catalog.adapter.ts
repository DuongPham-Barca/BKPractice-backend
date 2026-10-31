import type {
  CourseProblemCatalog,
  ProblemSummary,
} from '@learning/modules/courses/application/ports/out/course-problem-catalog.port';
import type { ProblemReferenceReader } from '@learning/modules/problems/application/ports/out/problem-reference-reader.port.out';
import { PROBLEM_REFERENCE_READER } from '@learning/modules/problems/problem.tokens';
import { Inject, Injectable } from '@nestjs/common';

/** Cầu nối port của `courses` sang `ProblemReferenceReader` do module `problems` export. */
@Injectable()
export class ProblemReferenceCatalogAdapter implements CourseProblemCatalog {
  constructor(@Inject(PROBLEM_REFERENCE_READER) private readonly reader: ProblemReferenceReader) {}

  async findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, ProblemSummary>> {
    const found = await this.reader.getProblemReferences(ids);
    return new Map(found.map((problem) => [problem.id, problem]));
  }
}
