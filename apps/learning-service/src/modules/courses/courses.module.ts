import { CourseReadiness } from '@learning/modules/courses/domain/services/course-readiness';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProblemsModule } from '../problems/problems.module';

import { CourseAuthorizationService } from './application/services/course-authorization.service';
import { CourseMutationService } from './application/services/course-mutation.service';
import { CoursePublishReadinessService } from './application/services/course-publish-readiness.service';
import { CourseViewAssembler } from './application/services/course-view.assembler';
import {
  AddChapterUseCase,
  RemoveChapterUseCase,
  ReorderChaptersUseCase,
  UpdateChapterUseCase,
} from './application/use-cases/chapter.use-cases';
import {
  DeleteCourseUseCase,
  HoldCourseUseCase,
  PublishCourseUseCase,
  RepublishCourseUseCase,
  RestoreCourseUseCase,
} from './application/use-cases/course-lifecycle.use-cases';
import { CreateCourseUseCase } from './application/use-cases/create-course.use-case';
import {
  AttachProblemUseCase,
  DetachProblemUseCase,
  ReorderChapterProblemsUseCase,
} from './application/use-cases/problem-in-chapter.use-cases';
import {
  GetManagedCourseUseCase,
  GetPublishedCourseUseCase,
  ListManagedCoursesUseCase,
  ListPublishedCoursesUseCase,
} from './application/use-cases/read-course.use-cases';
import { UpdateCourseUseCase } from './application/use-cases/update-course.use-case';
import {
  COURSE_PROBLEM_CATALOG,
  COURSE_REFERENCE_CHECKER,
  COURSE_REPOSITORY,
  COURSE_TRANSACTION_RUNNER,
} from './course.tokens';
import { Chapter, ChapterProblem, Course } from './entities/course.entity';
import { CourseTypeOrmReferenceChecker } from './infrastructure/persistence/course-reference.checker';
import { CourseTypeOrmRepository } from './infrastructure/persistence/course.typeorm-repository';
import { CourseTypeOrmTransactionContext } from './infrastructure/persistence/course.typeorm-transaction-context';
import { CourseTypeOrmTransactionRunner } from './infrastructure/persistence/course.typeorm-transaction-runner';
import { ProblemReferenceCatalogAdapter } from './infrastructure/problems/problem-catalog.adapter';
import { CourseExceptionFilter } from './presentation/http/course-exception.filter';
import { ManagedCoursesController } from './presentation/http/managed-courses.controller';

@Module({
  // ProblemsModule chỉ để lấy PROBLEM_REFERENCE_READER (API đọc duy nhất courses dùng).
  imports: [TypeOrmModule.forFeature([Course, Chapter, ChapterProblem]), ProblemsModule],
  controllers: [ManagedCoursesController],
  providers: [
    CourseExceptionFilter,
    CourseAuthorizationService,
    CourseReadiness,
    CoursePublishReadinessService,
    CourseViewAssembler,
    CourseMutationService,
    CreateCourseUseCase,
    UpdateCourseUseCase,
    PublishCourseUseCase,
    HoldCourseUseCase,
    RepublishCourseUseCase,
    DeleteCourseUseCase,
    RestoreCourseUseCase,
    AddChapterUseCase,
    UpdateChapterUseCase,
    RemoveChapterUseCase,
    ReorderChaptersUseCase,
    AttachProblemUseCase,
    DetachProblemUseCase,
    ReorderChapterProblemsUseCase,
    GetManagedCourseUseCase,
    ListManagedCoursesUseCase,
    GetPublishedCourseUseCase,
    ListPublishedCoursesUseCase,
    CourseTypeOrmRepository,
    CourseTypeOrmTransactionContext,
    CourseTypeOrmTransactionRunner,
    CourseTypeOrmReferenceChecker,
    ProblemReferenceCatalogAdapter,
    { provide: COURSE_REPOSITORY, useExisting: CourseTypeOrmRepository },
    { provide: COURSE_REFERENCE_CHECKER, useExisting: CourseTypeOrmReferenceChecker },
    { provide: COURSE_PROBLEM_CATALOG, useExisting: ProblemReferenceCatalogAdapter },
    { provide: COURSE_TRANSACTION_RUNNER, useExisting: CourseTypeOrmTransactionRunner },
  ],
})
export class CoursesModule {}
