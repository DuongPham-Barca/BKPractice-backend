import {
  CourseHasReferencesError,
  CourseNotFoundError,
  CourseNotReadyError,
  ForbiddenError,
} from '@learning/modules/courses/application/errors/application-errors';
import { CourseAuthorizationService } from '@learning/modules/courses/application/services/course-authorization.service';
import { CoursePublishReadinessService } from '@learning/modules/courses/application/services/course-publish-readiness.service';
import { InvalidCourseState } from '@learning/modules/courses/domain/errors/domain-validation.error';
import { CourseReadiness } from '@learning/modules/courses/domain/services/course-readiness';
import {
  courseWithProblem,
  draftCourse,
  FakeReferenceChecker,
  InMemoryCourseRepository,
  InlineTransactionRunner,
  lecturer,
  OTHER_ID,
  PROBLEM_ID,
  student,
} from '@learning/modules/courses/testing/course-test.fakes';

import {
  HardDeleteCourseUseCase,
  HoldCourseUseCase,
  PublishCourseUseCase,
  RepublishCourseUseCase,
  RestoreCourseUseCase,
  SoftDeleteCourseUseCase,
} from './course-lifecycle.use-cases';

describe('Course lifecycle use cases', () => {
  let repository: InMemoryCourseRepository;
  let checker: FakeReferenceChecker;
  let authorization: CourseAuthorizationService;
  let readiness: CoursePublishReadinessService;
  const transactions = new InlineTransactionRunner();

  beforeEach(() => {
    repository = new InMemoryCourseRepository();
    checker = new FakeReferenceChecker();
    authorization = new CourseAuthorizationService();
    readiness = new CoursePublishReadinessService(new CourseReadiness(), checker);
  });

  const seed = (course = courseWithProblem()) => {
    repository.store.set(course.id.value, course);
    return course;
  };

  describe('PublishCourseUseCase', () => {
    const build = () =>
      new PublishCourseUseCase(authorization, readiness, repository, transactions);

    it('publishes a course that has a published problem', async () => {
      checker.setProblem(PROBLEM_ID, { publishStatus: 'PUBLISHED' });
      const course = seed();

      const result = await build().execute(lecturer(), course.id.value);

      expect(result.status).toBe('PUBLISHED');
      expect(repository.saveCount).toBe(1);
    });

    it.each([
      ['DRAFT', false],
      ['ON_HOLD', false],
      ['PUBLISHED', true],
    ] as const)(
      'rejects publish when the only problem is %s / deleted=%s',
      async (publishStatus, isDeleted) => {
        checker.setProblem(PROBLEM_ID, { publishStatus, isDeleted });
        const course = seed();

        await expect(build().execute(lecturer(), course.id.value)).rejects.toMatchObject({
          issues: ['PUBLISHED_PROBLEM_REQUIRED'],
        });
        expect(course.status).toBe('DRAFT');
        expect(repository.saveCount).toBe(0);
      },
    );

    it('rejects publish when a referenced problem no longer exists', async () => {
      const course = seed();

      await expect(build().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        CourseNotReadyError,
      );
    });

    it('rejects publish of a course without chapters', async () => {
      const course = seed(draftCourse());

      const error = await build()
        .execute(lecturer(), course.id.value)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(CourseNotReadyError);
      expect((error as CourseNotReadyError).issues).toContain('CHAPTER_REQUIRED');
    });

    it('requires the LECTURER role and course:publish permission', async () => {
      const course = seed();

      await expect(build().execute(student(), course.id.value)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      await expect(
        build().execute({ ...lecturer(), permissions: ['course:create'] }, course.id.value),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('rejects a lecturer who is not the owner without changing state', async () => {
      checker.setProblem(PROBLEM_ID);
      const course = seed();

      await expect(build().execute(lecturer(OTHER_ID), course.id.value)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(course.status).toBe('DRAFT');
    });

    it('reports a missing course as not found', async () => {
      await expect(
        build().execute(lecturer(), '00000000-0000-4000-8000-0000000000ff'),
      ).rejects.toBeInstanceOf(CourseNotFoundError);
    });
  });

  describe('HoldCourseUseCase / RepublishCourseUseCase', () => {
    const hold = () => new HoldCourseUseCase(authorization, repository, transactions);
    const republish = () =>
      new RepublishCourseUseCase(authorization, readiness, repository, transactions);

    it('holds a published course and republishes it when still ready', async () => {
      checker.setProblem(PROBLEM_ID);
      const course = seed();
      course.publish();

      expect((await hold().execute(lecturer(), course.id.value)).status).toBe('ON_HOLD');
      expect((await republish().execute(lecturer(), course.id.value)).status).toBe('PUBLISHED');
    });

    it('blocks republish when the problem was held in the meantime', async () => {
      checker.setProblem(PROBLEM_ID);
      const course = seed();
      course.publish();
      await hold().execute(lecturer(), course.id.value);
      checker.setProblem(PROBLEM_ID, { publishStatus: 'ON_HOLD' });

      await expect(republish().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        CourseNotReadyError,
      );
      expect(course.status).toBe('ON_HOLD');
    });

    it('rejects hold of a draft course', async () => {
      const course = seed();

      await expect(hold().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        InvalidCourseState,
      );
    });
  });

  describe('SoftDeleteCourseUseCase / RestoreCourseUseCase', () => {
    const softDelete = () => new SoftDeleteCourseUseCase(authorization, repository, transactions);
    const restore = () => new RestoreCourseUseCase(authorization, repository, transactions);

    it('soft-deletes a published course and restores it to its previous status', async () => {
      const course = seed();
      course.publish();

      const deleted = await softDelete().execute(lecturer(), course.id.value);
      expect(deleted.isDeleted).toBe(true);
      expect(deleted.status).toBe('PUBLISHED');

      const restored = await restore().execute(lecturer(), course.id.value);
      expect(restored.isDeleted).toBe(false);
      expect(restored.status).toBe('PUBLISHED');
    });

    it('rejects soft-delete of a draft course', async () => {
      const course = seed();

      await expect(softDelete().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        InvalidCourseState,
      );
      expect(course.isDeleted).toBe(false);
    });

    it('rejects soft-delete of an already deleted course (hidden as not found)', async () => {
      const course = seed();
      course.publish();
      await softDelete().execute(lecturer(), course.id.value);

      await expect(softDelete().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        CourseNotFoundError,
      );
    });

    it('rejects restore of a course that is not deleted', async () => {
      const course = seed();

      await expect(restore().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        InvalidCourseState,
      );
    });

    it('rejects restore by a non-owner', async () => {
      const course = seed();
      course.publish();
      await softDelete().execute(lecturer(), course.id.value);

      await expect(restore().execute(lecturer(OTHER_ID), course.id.value)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });

  describe('HardDeleteCourseUseCase', () => {
    const hardDelete = () =>
      new HardDeleteCourseUseCase(authorization, repository, checker, transactions);

    it('hard-deletes an unreferenced draft course', async () => {
      const course = seed();

      await hardDelete().execute(lecturer(), course.id.value);

      expect(repository.hardDeleted).toEqual([course.id.value]);
      expect(repository.store.has(course.id.value)).toBe(false);
    });

    it('rejects a draft course that a class or assignment references (AC-017)', async () => {
      checker.referenced = true;
      const course = seed();

      await expect(hardDelete().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        CourseHasReferencesError,
      );
      expect(repository.store.has(course.id.value)).toBe(true);
    });

    it('rejects hard-delete of a non-draft course as an invalid state, not 404', async () => {
      const course = seed();
      course.publish();

      await expect(hardDelete().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        InvalidCourseState,
      );
      expect(repository.hardDeleted).toHaveLength(0);
    });

    it('rejects hard-delete by a non-owner', async () => {
      const course = seed();

      await expect(
        hardDelete().execute(lecturer(OTHER_ID), course.id.value),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
