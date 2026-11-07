import { Inject, Injectable } from '@nestjs/common';

import type { Principal } from '@/modules/progress/application/models';
import type { IListMySolvedProblemsPortIn } from '@/modules/progress/application/ports/in';
import type { ProgressRepository, SolvedProblemPage } from '@/modules/progress/domain/repositories';
import { PROGRESS_REPOSITORY } from '@/modules/progress/progress.tokens';
@Injectable()
export class ListMySolvedProblemsUseCase implements IListMySolvedProblemsPortIn {
  constructor(@Inject(PROGRESS_REPOSITORY) private readonly repository: ProgressRepository) {}
  execute(principal: Principal, page: number, limit: number): Promise<SolvedProblemPage> {
    return this.repository.listSolved(principal.userId, page, limit);
  }
}
