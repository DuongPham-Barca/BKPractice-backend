import { CourseReadiness } from '@learning/modules/courses/domain/services/course-readiness';
import { ProblemsModule } from '@learning/modules/problems/problems.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ADD_CHAPTER_PORT_IN,
  ATTACH_PROBLEM_PORT_IN,
  CREATE_COURSE_PORT_IN,
  DELETE_COURSE_PORT_IN,
  DETACH_PROBLEM_PORT_IN,
  GET_MANAGED_COURSE_PORT_IN,
  GET_PUBLISHED_COURSE_PORT_IN,
  HOLD_COURSE_PORT_IN,
  LIST_MANAGED_COURSES_PORT_IN,
  LIST_PUBLISHED_COURSES_PORT_IN,
  PUBLISH_COURSE_PORT_IN,
  REMOVE_CHAPTER_PORT_IN,
  REORDER_CHAPTER_PROBLEMS_PORT_IN,
  REORDER_CHAPTERS_PORT_IN,
  REPUBLISH_COURSE_PORT_IN,
  RESTORE_COURSE_PORT_IN,
  UPDATE_CHAPTER_PORT_IN,
  UPDATE_COURSE_PORT_IN,
} from './application/ports/in/course-use-cases.port.in';
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
  COURSE_REPOSITORY,
  COURSE_TRANSACTION_RUNNER,
} from './course.tokens';
import { Chapter, ChapterProblem, Course } from './entities/course.entity';
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
    ProblemReferenceCatalogAdapter,
    { provide: COURSE_REPOSITORY, useExisting: CourseTypeOrmRepository },
    { provide: COURSE_PROBLEM_CATALOG, useExisting: ProblemReferenceCatalogAdapter },
    { provide: COURSE_TRANSACTION_RUNNER, useExisting: CourseTypeOrmTransactionRunner },
    { provide: CREATE_COURSE_PORT_IN, useExisting: CreateCourseUseCase },
    { provide: UPDATE_COURSE_PORT_IN, useExisting: UpdateCourseUseCase },
    { provide: PUBLISH_COURSE_PORT_IN, useExisting: PublishCourseUseCase },
    { provide: HOLD_COURSE_PORT_IN, useExisting: HoldCourseUseCase },
    { provide: REPUBLISH_COURSE_PORT_IN, useExisting: RepublishCourseUseCase },
    { provide: DELETE_COURSE_PORT_IN, useExisting: DeleteCourseUseCase },
    { provide: RESTORE_COURSE_PORT_IN, useExisting: RestoreCourseUseCase },
    { provide: ADD_CHAPTER_PORT_IN, useExisting: AddChapterUseCase },
    { provide: UPDATE_CHAPTER_PORT_IN, useExisting: UpdateChapterUseCase },
    { provide: REMOVE_CHAPTER_PORT_IN, useExisting: RemoveChapterUseCase },
    { provide: REORDER_CHAPTERS_PORT_IN, useExisting: ReorderChaptersUseCase },
    { provide: ATTACH_PROBLEM_PORT_IN, useExisting: AttachProblemUseCase },
    { provide: DETACH_PROBLEM_PORT_IN, useExisting: DetachProblemUseCase },
    { provide: REORDER_CHAPTER_PROBLEMS_PORT_IN, useExisting: ReorderChapterProblemsUseCase },
    { provide: GET_MANAGED_COURSE_PORT_IN, useExisting: GetManagedCourseUseCase },
    { provide: LIST_MANAGED_COURSES_PORT_IN, useExisting: ListManagedCoursesUseCase },
    { provide: GET_PUBLISHED_COURSE_PORT_IN, useExisting: GetPublishedCourseUseCase },
    { provide: LIST_PUBLISHED_COURSES_PORT_IN, useExisting: ListPublishedCoursesUseCase },
  ],
})
export class CoursesModule {}
