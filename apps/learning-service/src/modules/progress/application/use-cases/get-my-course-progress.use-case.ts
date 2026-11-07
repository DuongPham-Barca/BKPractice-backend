import { Inject, Injectable } from '@nestjs/common';

import { CourseProgressNotFoundError } from '@/modules/progress/application/errors';
import type { Principal } from '@/modules/progress/application/models';
import type { IGetMyCourseProgressPortIn } from '@/modules/progress/application/ports/in';
import type { CourseStructureReader } from '@/modules/progress/application/ports/out';
import type { CourseProgressResult } from '@/modules/progress/application/results';
import type { ProgressRepository } from '@/modules/progress/domain/repositories';
import { CourseCompletionCalculator } from '@/modules/progress/domain/services';
import { PROGRESS_REPOSITORY, COURSE_STRUCTURE_READER } from '@/modules/progress/progress.tokens';
@Injectable()
export class GetMyCourseProgressUseCase implements IGetMyCourseProgressPortIn {
  constructor(
    @Inject(PROGRESS_REPOSITORY) private readonly repository: ProgressRepository,
    @Inject(COURSE_STRUCTURE_READER) private readonly courses: CourseStructureReader,
    private readonly calculator: CourseCompletionCalculator,
  ) {}
  async execute(principal: Principal, courseId: string): Promise<CourseProgressResult> {
    const structure = await this.courses.loadVisibleStructure(courseId);
    if (!structure) throw new CourseProgressNotFoundError();
    const ids = structure.chapters.flatMap((chapter) => chapter.problemIds);
    const solved = await this.repository.findSolved(principal.userId, ids);
    return this.calculator.calculate(structure, solved);
  }
}
