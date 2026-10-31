import type { Principal } from '@learning/modules/courses/application/models/principal';
import type {
  CourseListFilter,
  CoursePage,
  CourseReferenceChecker,
  CourseRepository,
  ManagedCourseListFilter,
} from '@learning/modules/courses/application/ports/out/course-repository.port';
import type { TransactionRunner } from '@learning/modules/courses/application/ports/out/transaction-runner.port';
import { Course } from '@learning/modules/courses/domain/course.aggregate';
import {
  ChapterDescription,
  ChapterTitle,
  CourseDescription,
  CourseSlug,
  CourseTitle,
  CreatedBy,
  ProblemReference,
} from '@learning/modules/courses/domain/value-objects';

export const OWNER_ID = '00000000-0000-4000-8000-0000000000a1';
export const OTHER_ID = '00000000-0000-4000-8000-0000000000b2';
export const PROBLEM_ID = '00000000-0000-4000-8000-0000000000c3';

export const ALL_COURSE_PERMISSIONS = [
  'course:create',
  'course:update',
  'course:publish',
  'course:hold',
  'course:republish',
  'course:delete',
  'course:restore',
  'course:read-managed',
] as const;

export function lecturer(userId = OWNER_ID): Principal {
  return { userId, roles: ['LECTURER'], permissions: ALL_COURSE_PERMISSIONS };
}

export function student(): Principal {
  return { userId: OTHER_ID, roles: ['STUDENT'], permissions: [] };
}

export function draftCourse(slug = 'intro-c', createdBy = OWNER_ID): Course {
  return Course.create({
    slug: new CourseSlug(slug),
    title: new CourseTitle('Intro C'),
    description: new CourseDescription(null),
    createdBy: new CreatedBy(createdBy),
  });
}

export function courseWithProblem(problemId = PROBLEM_ID, slug = 'intro-c'): Course {
  const course = draftCourse(slug);
  const chapterId = course.addChapter({
    title: new ChapterTitle('Chapter 1'),
    description: new ChapterDescription(null),
  });
  course.addProblemToChapter(chapterId, new ProblemReference(problemId));
  return course;
}

export class InMemoryCourseRepository implements CourseRepository {
  readonly store = new Map<string, Course>();
  saveCount = 0;
  hardDeleted: string[] = [];

  findById(id: string): Promise<Course | null> {
    const course = this.store.get(id);
    return Promise.resolve(course && !course.isDeleted ? course : null);
  }
  findByIdIncludingDeleted(id: string): Promise<Course | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  findPublishedByIdOrSlug(idOrSlug: string): Promise<Course | null> {
    const found = [...this.store.values()].find(
      (c) =>
        (c.id.value === idOrSlug || c.slug.value === idOrSlug) && c.isPublished && !c.isDeleted,
    );
    return Promise.resolve(found ?? null);
  }
  findManagedById(id: string, ownerId: string, includeDeleted: boolean): Promise<Course | null> {
    const course = this.store.get(id);
    if (!course || course.createdBy.value !== ownerId) return Promise.resolve(null);
    return Promise.resolve(course.isDeleted && !includeDeleted ? null : course);
  }
  loadForUpdate(id: string, includeDeleted = false): Promise<Course | null> {
    return includeDeleted ? this.findByIdIncludingDeleted(id) : this.findById(id);
  }
  listPublished(filter: CourseListFilter): Promise<CoursePage<Course>> {
    const all = [...this.store.values()].filter((c) => c.isPublished && !c.isDeleted);
    return Promise.resolve(this.paginate(all, filter.page, filter.limit));
  }
  listManaged(filter: ManagedCourseListFilter): Promise<CoursePage<Course>> {
    const all = [...this.store.values()].filter(
      (c) => c.createdBy.value === filter.ownerId && (filter.includeDeleted || !c.isDeleted),
    );
    return Promise.resolve(this.paginate(all, filter.page, filter.limit));
  }
  isSlugAvailable(slug: string, excludeCourseId?: string): Promise<boolean> {
    return Promise.resolve(
      ![...this.store.values()].some(
        (c) => c.slug.value === slug && c.id.value !== excludeCourseId,
      ),
    );
  }
  save(course: Course): Promise<void> {
    this.saveCount += 1;
    this.store.set(course.id.value, course);
    return Promise.resolve();
  }
  hardDelete(id: string): Promise<boolean> {
    this.hardDeleted.push(id);
    return Promise.resolve(this.store.delete(id));
  }

  private paginate(items: Course[], page: number, limit: number): CoursePage<Course> {
    return {
      items: items.slice((page - 1) * limit, page * limit),
      total: items.length,
      page,
      limit,
    };
  }
}

type ProblemState = { publishStatus: 'DRAFT' | 'PUBLISHED' | 'ON_HOLD'; isDeleted: boolean };

export class FakeReferenceChecker implements CourseReferenceChecker {
  readonly problems = new Map<string, ProblemState & { createdBy: string }>();
  referenced = false;

  setProblem(problemId: string, state: Partial<ProblemState> & { createdBy?: string } = {}): void {
    this.problems.set(problemId, {
      publishStatus: state.publishStatus ?? 'PUBLISHED',
      isDeleted: state.isDeleted ?? false,
      createdBy: state.createdBy ?? OWNER_ID,
    });
  }

  isProblemAttachable(problemId: string, principalUserId: string) {
    const p = this.problems.get(problemId);
    const attachable =
      p !== undefined &&
      !p.isDeleted &&
      (p.publishStatus === 'PUBLISHED' || p.createdBy === principalUserId);
    return Promise.resolve({
      attachable,
      createdBy: p?.createdBy,
      publishStatus: p?.publishStatus,
      isDeleted: p?.isDeleted,
    });
  }
  getProblemState(problemId: string) {
    const p = this.problems.get(problemId);
    return Promise.resolve({ publishStatus: p?.publishStatus, isDeleted: p?.isDeleted });
  }
  hasCourseReferences(): Promise<boolean> {
    return Promise.resolve(this.referenced);
  }
}

export class InlineTransactionRunner implements TransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}
