import { CourseReadiness } from '@learning/modules/courses/domain/services/course-readiness';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProblemsModule } from '../problems/problems.module';

import { CourseAuthorizationService } from './application/services/course-authorization.service';
import { CoursePublishReadinessService } from './application/services/course-publish-readiness.service';
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
import { CourseTypeOrmReferenceChecker } from './infrastructure/persistence/course-reference.checker';
import { CourseTypeOrmRepository } from './infrastructure/persistence/course.typeorm-repository';
import { CourseTypeOrmTransactionContext } from './infrastructure/persistence/course.typeorm-transaction-context';
import { CourseTypeOrmTransactionRunner } from './infrastructure/persistence/course.typeorm-transaction-runner';
import { CourseExceptionFilter } from './presentation/http/course-exception.filter';
import { ManagedCoursesController } from './presentation/http/managed-courses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Chapter, ChapterProblem]), ProblemsModule],
  controllers: [ManagedCoursesController],
  providers: [
    CourseExceptionFilter,
    CourseAuthorizationService,
    CoursePublishReadinessService,
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
    CourseTypeOrmTransactionContext,
    CourseTypeOrmTransactionRunner,
    CourseTypeOrmReferenceChecker,
    { provide: COURSE_REPOSITORY, useExisting: CourseTypeOrmRepository },
    { provide: COURSE_REFERENCE_CHECKER, useExisting: CourseTypeOrmReferenceChecker },
    { provide: COURSE_TRANSACTION_RUNNER, useExisting: CourseTypeOrmTransactionRunner },
  ],
})
export class CoursesModule {}
