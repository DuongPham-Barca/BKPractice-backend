import { CourseReadiness } from '@learning/modules/courses/domain/services/course-readiness';
import { Module } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import type { ProblemReferenceReader } from '../problems/application/ports/out/problem-reference-reader.port.out';
import { PROBLEM_REFERENCE_READER } from '../problems/problem.tokens';
import { ProblemsModule } from '../problems/problems.module';

import { CourseAuthorizationService } from './application/services/course-authorization.service';
import {
  AddChapterUseCase,
  UpdateChapterUseCase,
  RemoveChapterUseCase,
  ReorderChaptersUseCase,
} from './application/use-cases/chapter.use-cases';
import {
  PublishCourseUseCase,
  HoldCourseUseCase,
  RepublishCourseUseCase,
  SoftDeleteCourseUseCase,
  RestoreCourseUseCase,
  HardDeleteCourseUseCase,
} from './application/use-cases/course-lifecycle.use-cases';
import { CreateCourseUseCase } from './application/use-cases/create-course.use-case';
import {
  AddProblemToChapterUseCase,
  RemoveProblemFromChapterUseCase,
  ReorderProblemsInChapterUseCase,
} from './application/use-cases/problem-in-chapter.use-cases';
import {
  GetManagedCourseUseCase,
  ListManagedCoursesUseCase,
  GetPublishedCourseUseCase,
  ListPublishedCoursesUseCase,
  PreviewCourseUseCase,
} from './application/use-cases/read-course.use-cases';
import { UpdateCourseUseCase } from './application/use-cases/update-course.use-case';
import {
  COURSE_REPOSITORY,
  COURSE_REFERENCE_CHECKER,
  COURSE_TRANSACTION_RUNNER,
} from './course.tokens';
import { Course, Chapter, ChapterProblem } from './entities/course.entity';
import { CourseTypeOrmRepository } from './infrastructure/persistence/course.typeorm-repository';
import { CourseTypeOrmTransactionRunner } from './infrastructure/persistence/course.typeorm-transaction-runner';
import { CourseExceptionFilter } from './presentation/http/course-exception.filter';
import { ManagedCoursesController } from './presentation/http/managed-courses.controller';

// CourseReferenceChecker adapter: reuse problem reference reader

@Injectable()
class CourseReferenceCheckerAdapter {
  constructor(
    @Inject(PROBLEM_REFERENCE_READER) private readonly problemReader: ProblemReferenceReader,
  ) {}
  async isProblemAttachable(problemId: string, principalUserId: string) {
    const info = await this.problemReader.getProblemReference(problemId);
    const attachable =
      info.publishStatus !== undefined &&
      info.isDeleted === false &&
      (info.publishStatus === 'PUBLISHED' ||
        ((info.publishStatus === 'DRAFT' || info.publishStatus === 'ON_HOLD') &&
          info.createdBy === principalUserId));
    return {
      attachable,
      createdBy: info.createdBy,
      publishStatus: info.publishStatus,
      isDeleted: info.isDeleted,
    };
  }
  async hasCourseReferences(_courseId: string): Promise<boolean> {
    return false;
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Course, Chapter, ChapterProblem]), ProblemsModule],
  controllers: [ManagedCoursesController],
  providers: [
    CourseExceptionFilter,
    CourseAuthorizationService,
    CourseReadiness,
    CreateCourseUseCase,
    UpdateCourseUseCase,
    PublishCourseUseCase,
    HoldCourseUseCase,
    RepublishCourseUseCase,
    SoftDeleteCourseUseCase,
    RestoreCourseUseCase,
    HardDeleteCourseUseCase,
    AddChapterUseCase,
    UpdateChapterUseCase,
    RemoveChapterUseCase,
    ReorderChaptersUseCase,
    AddProblemToChapterUseCase,
    RemoveProblemFromChapterUseCase,
    ReorderProblemsInChapterUseCase,
    GetManagedCourseUseCase,
    ListManagedCoursesUseCase,
    GetPublishedCourseUseCase,
    ListPublishedCoursesUseCase,
    PreviewCourseUseCase,
    CourseTypeOrmRepository,
    CourseTypeOrmTransactionRunner,
    CourseReferenceCheckerAdapter,
    { provide: COURSE_REPOSITORY, useExisting: CourseTypeOrmRepository },
    { provide: COURSE_REFERENCE_CHECKER, useExisting: CourseReferenceCheckerAdapter },
    { provide: COURSE_TRANSACTION_RUNNER, useExisting: CourseTypeOrmTransactionRunner },
    // reference checker delegates to PROBLEM_REFERENCE_READER
  ],
})
export class CoursesModule {}
