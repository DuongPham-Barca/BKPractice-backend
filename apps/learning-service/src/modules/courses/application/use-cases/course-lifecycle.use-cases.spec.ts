import {
  CourseHasReferencesError,
  CourseNotFoundError,
  CourseNotReadyError,
  ForbiddenError,
} from '@learning/modules/courses/application/errors/application-errors';
import { InvalidCourseState } from '@learning/modules/courses/domain/errors/domain-validation.error';
import {
  courseWithProblem,
  createCourseTestKit,
  draftCourse,
  lecturer,
  OTHER_ID,
  PROBLEM_ID,
  student,
} from '@learning/modules/courses/testing/course-test.fakes';

import {
  DeleteCourseUseCase,
  HoldCourseUseCase,
  PublishCourseUseCase,
  RepublishCourseUseCase,
  RestoreCourseUseCase,
} from './course-lifecycle.use-cases';

describe('Course lifecycle use cases', () => {
  let kit: ReturnType<typeof createCourseTestKit>;

  beforeEach(() => {
    kit = createCourseTestKit();
  });

  const publish = () => new PublishCourseUseCase(kit.mutation, kit.readiness);
  const hold = () => new HoldCourseUseCase(kit.mutation);
  const republish = () => new RepublishCourseUseCase(kit.mutation, kit.readiness);
  const restore = () => new RestoreCourseUseCase(kit.mutation);
  const remove = () =>
    new DeleteCourseUseCase(kit.authorization, kit.repository, kit.checker, kit.transactions);

  describe('PublishCourseUseCase', () => {
    it('publishes a course that has a published problem and reports it ready', async () => {
      kit.catalog.setProblem(PROBLEM_ID);
      const course = kit.seed();

      const result = await publish().execute(lecturer(), course.id.value);

      expect(result.status).toBe('PUBLISHED');
      expect(result.readiness).toEqual({ ready: true, issues: [] });
      expect(kit.repository.saveCount).toBe(1);
    });

    it.each([
      ['DRAFT', false],
      ['ON_HOLD', false],
      ['PUBLISHED', true],
    ] as const)(
      'rejects publish when the only problem is %s / deleted=%s (AC-006)',
      async (publishStatus, isDeleted) => {
        kit.catalog.setProblem(PROBLEM_ID, { publishStatus, isDeleted });
        const course = kit.seed();

        await expect(publish().execute(lecturer(), course.id.value)).rejects.toMatchObject({
          issues: ['PUBLISHED_PROBLEM_REQUIRED'],
        });
        expect(course.status).toBe('DRAFT');
        expect(kit.repository.saveCount).toBe(0);
      },
    );

    it('rejects publish when a referenced problem no longer exists', async () => {
      const course = kit.seed();

      await expect(publish().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        CourseNotReadyError,
      );
    });

    it('rejects publish of a course without chapters', async () => {
      const course = kit.seed(draftCourse());

      const error = await publish()
        .execute(lecturer(), course.id.value)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(CourseNotReadyError);
      expect((error as CourseNotReadyError).issues).toContain('CHAPTER_REQUIRED');
    });

    it('requires the LECTURER role and course:publish permission (AC-002)', async () => {
      const course = kit.seed();

      await expect(publish().execute(student(), course.id.value)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      await expect(
        publish().execute({ ...lecturer(), permissions: ['course:create'] }, course.id.value),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('rejects a lecturer who is not the owner without changing state', async () => {
      kit.catalog.setProblem(PROBLEM_ID);
      const course = kit.seed();

      await expect(publish().execute(lecturer(OTHER_ID), course.id.value)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(course.status).toBe('DRAFT');
    });

    it('reports a missing course as not found', async () => {
      await expect(
        publish().execute(lecturer(), '00000000-0000-4000-8000-0000000000ff'),
      ).rejects.toBeInstanceOf(CourseNotFoundError);
    });
  });

  describe('HoldCourseUseCase / RepublishCourseUseCase', () => {
    it('holds a published course and republishes it when still ready', async () => {
      kit.catalog.setProblem(PROBLEM_ID);
      const course = kit.seed();
      course.publish();

      expect((await hold().execute(lecturer(), course.id.value)).status).toBe('ON_HOLD');
      expect((await republish().execute(lecturer(), course.id.value)).status).toBe('PUBLISHED');
    });

    it('blocks republish when the problem was held in the meantime', async () => {
      kit.catalog.setProblem(PROBLEM_ID);
      const course = kit.seed();
      course.publish();
      await hold().execute(lecturer(), course.id.value);
      kit.catalog.setProblem(PROBLEM_ID, { publishStatus: 'ON_HOLD' });

      await expect(republish().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        CourseNotReadyError,
      );
      expect(kit.stored(course).status).toBe('ON_HOLD');
    });

    it('rejects hold of a draft course', async () => {
      const course = kit.seed();

      await expect(hold().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        InvalidCourseState,
      );
    });
  });

  describe('DeleteCourseUseCase', () => {
    it('hard-deletes an unreferenced draft course', async () => {
      const course = kit.seed();

      await remove().execute(lecturer(), course.id.value);

      expect(kit.repository.hardDeleted).toEqual([course.id.value]);
      expect(kit.repository.store.has(course.id.value)).toBe(false);
    });

    it('rejects a draft course that a class or assignment references (AC-017)', async () => {
      kit.checker.referenced = true;
      const course = kit.seed();

      await expect(remove().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        CourseHasReferencesError,
      );
      expect(kit.repository.store.has(course.id.value)).toBe(true);
    });

    it.each(['PUBLISHED', 'ON_HOLD'] as const)(
      'soft-deletes a %s course, keeps its status and never hard-deletes (AC-014)',
      async (status) => {
        kit.checker.referenced = true; // có Class tham chiếu: vẫn xoá mềm được, Class không bị đụng
        const course = kit.seed();
        course.publish();
        if (status === 'ON_HOLD') course.hold();

        await remove().execute(lecturer(), course.id.value);

        expect(kit.stored(course).isDeleted).toBe(true);
        expect(kit.stored(course).status).toBe(status);
        expect(kit.repository.hardDeleted).toHaveLength(0);
      },
    );

    it('hides an already deleted course as not found', async () => {
      const course = kit.seed();
      course.publish();
      await remove().execute(lecturer(), course.id.value);

      await expect(remove().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        CourseNotFoundError,
      );
    });

    it('rejects delete by a non-owner and without permission', async () => {
      const course = kit.seed();

      await expect(remove().execute(lecturer(OTHER_ID), course.id.value)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      await expect(remove().execute(student(), course.id.value)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(kit.repository.store.has(course.id.value)).toBe(true);
    });
  });

  describe('RestoreCourseUseCase', () => {
    it('restores a soft-deleted course to its previous status', async () => {
      kit.catalog.setProblem(PROBLEM_ID);
      const course = kit.seed(courseWithProblem());
      course.publish();
      await remove().execute(lecturer(), course.id.value);

      const restored = await restore().execute(lecturer(), course.id.value);

      expect(restored.deletedAt).toBeNull();
      expect(restored.status).toBe('PUBLISHED');
    });

    it('rejects restore of a course that is not deleted', async () => {
      const course = kit.seed();

      await expect(restore().execute(lecturer(), course.id.value)).rejects.toBeInstanceOf(
        InvalidCourseState,
      );
    });

    it('rejects restore by a non-owner', async () => {
      const course = kit.seed();
      course.publish();
      await remove().execute(lecturer(), course.id.value);

      await expect(restore().execute(lecturer(OTHER_ID), course.id.value)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });
});
