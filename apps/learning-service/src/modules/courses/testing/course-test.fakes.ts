import type { Principal } from '@learning/modules/courses/application/models/principal';
import type {
  CourseProblemCatalog,
  ProblemSummary,
} from '@learning/modules/courses/application/ports/out/course-problem-catalog.port';
import type {
  CourseListFilter,
  CoursePage,
  CourseReferenceChecker,
  CourseRepository,
  ManagedCourseListFilter,
} from '@learning/modules/courses/application/ports/out/course-repository.port';
import type { TransactionRunner } from '@learning/modules/courses/application/ports/out/transaction-runner.port';
import { CourseAuthorizationService } from '@learning/modules/courses/application/services/course-authorization.service';
import { CourseMutationService } from '@learning/modules/courses/application/services/course-mutation.service';
import { CoursePublishReadinessService } from '@learning/modules/courses/application/services/course-publish-readiness.service';
import { CourseViewAssembler } from '@learning/modules/courses/application/services/course-view.assembler';
import { Course } from '@learning/modules/courses/domain/course.aggregate';
import { CourseReadiness } from '@learning/modules/courses/domain/services/course-readiness';
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
    return Promise.resolve(course && !course.isDeleted ? clone(course) : null);
  }
  findByIdIncludingDeleted(id: string): Promise<Course | null> {
    const course = this.store.get(id);
    return Promise.resolve(course ? clone(course) : null);
  }
  findPublishedByIdOrSlug(idOrSlug: string): Promise<Course | null> {
    const found = [...this.store.values()].find(
      (c) =>
        (c.id.value === idOrSlug || c.slug.value === idOrSlug) && c.isPublished && !c.isDeleted,
    );
    return Promise.resolve(found ? clone(found) : null);
  }
  findManagedById(id: string, ownerId: string, includeDeleted: boolean): Promise<Course | null> {
    const course = this.store.get(id);
    if (!course || course.createdBy.value !== ownerId) return Promise.resolve(null);
    return Promise.resolve(course.isDeleted && !includeDeleted ? null : clone(course));
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
      (c) =>
        c.createdBy.value === filter.ownerId &&
        (filter.includeDeleted || !c.isDeleted) &&
        (!filter.search || c.title.value.toLowerCase().includes(filter.search.toLowerCase())),
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
    this.store.set(course.id.value, clone(course));
    return Promise.resolve();
  }
  hardDelete(id: string): Promise<boolean> {
    this.hardDeleted.push(id);
    return Promise.resolve(this.store.delete(id));
  }

  private paginate(items: Course[], page: number, limit: number): CoursePage<Course> {
    return {
      items: items.slice((page - 1) * limit, page * limit).map(clone),
      total: items.length,
      page,
      limit,
    };
  }
}

/** Giống DB: mỗi lần nạp là một bản sao, thay đổi chưa `save` không rò vào state đã lưu. */
function clone(course: Course): Course {
  return Course.rehydrate(course.toSnapshot());
}

export class FakeProblemCatalog implements CourseProblemCatalog {
  readonly problems = new Map<string, ProblemSummary>();

  setProblem(problemId: string, overrides: Partial<ProblemSummary> = {}): ProblemSummary {
    const problem: ProblemSummary = {
      id: problemId,
      slug: `slug-${problemId.slice(-4)}`,
      title: `Problem ${problemId.slice(-4)}`,
      problemType: 'STANDARD',
      difficulty: 'EASY',
      publishStatus: 'PUBLISHED',
      isDeleted: false,
      createdBy: OWNER_ID,
      ...overrides,
    };
    this.problems.set(problemId, problem);
    return problem;
  }

  findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, ProblemSummary>> {
    const found = new Map<string, ProblemSummary>();
    for (const id of ids) {
      const problem = this.problems.get(id);
      if (problem) found.set(id, problem);
    }
    return Promise.resolve(found);
  }
}

export class FakeReferenceChecker implements CourseReferenceChecker {
  referenced = false;

  hasCourseReferences(): Promise<boolean> {
    return Promise.resolve(this.referenced);
  }
}

export class InlineTransactionRunner implements TransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}

/** Dựng toàn bộ service application trên fake in-memory để test use case mà không cần Nest. */
export function createCourseTestKit() {
  const repository = new InMemoryCourseRepository();
  const catalog = new FakeProblemCatalog();
  const checker = new FakeReferenceChecker();
  const transactions = new InlineTransactionRunner();
  const authorization = new CourseAuthorizationService();
  const readiness = new CoursePublishReadinessService(new CourseReadiness(), catalog);
  const views = new CourseViewAssembler(catalog, readiness);
  const mutation = new CourseMutationService(authorization, views, repository, transactions);
  return {
    repository,
    catalog,
    checker,
    transactions,
    authorization,
    readiness,
    views,
    mutation,
    seed(course: Course = courseWithProblem()): Course {
      repository.store.set(course.id.value, course);
      return course;
    },
    /** State đã lưu của một Course (bản sao mới nhất trong repository). */
    stored(course: Course): Course {
      const saved = repository.store.get(course.id.value);
      if (!saved) throw new Error('Course is not stored');
      return saved;
    },
  };
}
