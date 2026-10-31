import type {
  ProblemReferenceReader,
  ProblemReferenceInfo,
} from '@learning/modules/problems/application/ports/out/problem-reference-reader.port.out';
import type { ProblemRepository } from '@learning/modules/problems/domain/repositories/problem.repository.port.out';
import { PROBLEM_REPOSITORY } from '@learning/modules/problems/problem.tokens';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ProblemReferenceReaderAdapter implements ProblemReferenceReader {
  constructor(@Inject(PROBLEM_REPOSITORY) private readonly repository: ProblemRepository) {}

  async getProblemReference(problemId: string): Promise<ProblemReferenceInfo> {
    const problem = await this.repository.findByIdIncludingDeleted(problemId);
    if (!problem) return { publishStatus: undefined, isDeleted: undefined, createdBy: undefined };
    return {
      publishStatus: problem.publishStatus,
      isDeleted: problem.deletedAt !== null,
      createdBy: problem.createdBy.value,
    };
  }
}
