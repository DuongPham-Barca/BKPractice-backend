import type {
  CreateCourseCommand,
  UpdateCourseCommand,
} from '@learning/modules/courses/application/commands/course.commands';
import type { Principal } from '@learning/modules/courses/application/models/principal';
import type {
  LearnerCourseResult,
  LearnerCourseSummaryResult,
  ManagedCourseResult,
  ManagedCourseSummaryResult,
} from '@learning/modules/courses/application/results/course.results';
import type {
  CourseListFilter,
  CoursePage,
} from '@learning/modules/courses/domain/repositories/course-repository.port.out';
import type {
  ChapterDescription,
  ChapterId,
  ChapterTitle,
  ProblemReference,
} from '@learning/modules/courses/domain/value-objects';

export interface ICreateCoursePortIn {
  execute(principal: Principal, command: CreateCourseCommand): Promise<ManagedCourseResult>;
}
export const CREATE_COURSE_PORT_IN = Symbol('CREATE_COURSE_PORT_IN');

export interface IUpdateCoursePortIn {
  execute(
    principal: Principal,
    courseId: string,
    command: UpdateCourseCommand,
    now?: Date,
  ): Promise<ManagedCourseResult>;
}
export const UPDATE_COURSE_PORT_IN = Symbol('UPDATE_COURSE_PORT_IN');

export interface IPublishCoursePortIn {
  execute(principal: Principal, courseId: string, now?: Date): Promise<ManagedCourseResult>;
}
export const PUBLISH_COURSE_PORT_IN = Symbol('PUBLISH_COURSE_PORT_IN');

export interface IHoldCoursePortIn {
  execute(principal: Principal, courseId: string, now?: Date): Promise<ManagedCourseResult>;
}
export const HOLD_COURSE_PORT_IN = Symbol('HOLD_COURSE_PORT_IN');

export interface IRepublishCoursePortIn {
  execute(principal: Principal, courseId: string, now?: Date): Promise<ManagedCourseResult>;
}
export const REPUBLISH_COURSE_PORT_IN = Symbol('REPUBLISH_COURSE_PORT_IN');

export interface IDeleteCoursePortIn {
  execute(principal: Principal, courseId: string, now?: Date): Promise<void>;
}
export const DELETE_COURSE_PORT_IN = Symbol('DELETE_COURSE_PORT_IN');

export interface IRestoreCoursePortIn {
  execute(principal: Principal, courseId: string, now?: Date): Promise<ManagedCourseResult>;
}
export const RESTORE_COURSE_PORT_IN = Symbol('RESTORE_COURSE_PORT_IN');

export interface IAddChapterPortIn {
  execute(
    principal: Principal,
    courseId: string,
    title: ChapterTitle,
    description?: ChapterDescription | null,
    position?: number,
    now?: Date,
  ): Promise<ManagedCourseResult>;
}
export const ADD_CHAPTER_PORT_IN = Symbol('ADD_CHAPTER_PORT_IN');

export interface IUpdateChapterPortIn {
  execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    title: ChapterTitle | undefined,
    description: ChapterDescription | undefined,
    now?: Date,
  ): Promise<ManagedCourseResult>;
}
export const UPDATE_CHAPTER_PORT_IN = Symbol('UPDATE_CHAPTER_PORT_IN');

export interface IRemoveChapterPortIn {
  execute(principal: Principal, courseId: string, chapterId: ChapterId, now?: Date): Promise<void>;
}
export const REMOVE_CHAPTER_PORT_IN = Symbol('REMOVE_CHAPTER_PORT_IN');

export interface IReorderChaptersPortIn {
  execute(
    principal: Principal,
    courseId: string,
    orderedIds: readonly ChapterId[],
    now?: Date,
  ): Promise<ManagedCourseResult>;
}
export const REORDER_CHAPTERS_PORT_IN = Symbol('REORDER_CHAPTERS_PORT_IN');

export interface IAttachProblemPortIn {
  execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    problemId: ProblemReference,
    position?: number,
    now?: Date,
  ): Promise<ManagedCourseResult>;
}
export const ATTACH_PROBLEM_PORT_IN = Symbol('ATTACH_PROBLEM_PORT_IN');

export interface IDetachProblemPortIn {
  execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    problemId: ProblemReference,
    now?: Date,
  ): Promise<void>;
}
export const DETACH_PROBLEM_PORT_IN = Symbol('DETACH_PROBLEM_PORT_IN');

export interface IReorderChapterProblemsPortIn {
  execute(
    principal: Principal,
    courseId: string,
    chapterId: ChapterId,
    orderedIds: readonly ProblemReference[],
    now?: Date,
  ): Promise<ManagedCourseResult>;
}
export const REORDER_CHAPTER_PROBLEMS_PORT_IN = Symbol('REORDER_CHAPTER_PROBLEMS_PORT_IN');

export interface IGetManagedCoursePortIn {
  execute(
    principal: Principal,
    courseId: string,
    includeDeleted: boolean,
  ): Promise<ManagedCourseResult>;
}
export const GET_MANAGED_COURSE_PORT_IN = Symbol('GET_MANAGED_COURSE_PORT_IN');

export interface IListManagedCoursesPortIn {
  execute(
    principal: Principal,
    includeDeleted: boolean,
    page: number,
    limit: number,
    search?: string,
  ): Promise<CoursePage<ManagedCourseSummaryResult>>;
}
export const LIST_MANAGED_COURSES_PORT_IN = Symbol('LIST_MANAGED_COURSES_PORT_IN');

export interface IGetPublishedCoursePortIn {
  execute(idOrSlug: string): Promise<LearnerCourseResult>;
}
export const GET_PUBLISHED_COURSE_PORT_IN = Symbol('GET_PUBLISHED_COURSE_PORT_IN');

export interface IListPublishedCoursesPortIn {
  execute(filter: CourseListFilter): Promise<CoursePage<LearnerCourseSummaryResult>>;
}
export const LIST_PUBLISHED_COURSES_PORT_IN = Symbol('LIST_PUBLISHED_COURSES_PORT_IN');
