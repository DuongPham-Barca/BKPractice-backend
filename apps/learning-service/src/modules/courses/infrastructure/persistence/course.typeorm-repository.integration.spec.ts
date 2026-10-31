import { InitialLearningSchema1700000003000 } from '@learning/database/migrations/1700000003000-InitialLearningSchema';
import { Lrn001ProblemManagement1700000004000 } from '@learning/database/migrations/1700000004000-Lrn001ProblemManagement';
import { Lrn004ClassEnrollment1700000004000 } from '@learning/database/migrations/1700000004000-Lrn004ClassEnrollment';
import { Lrn006Progress1700000005000 } from '@learning/database/migrations/1700000005000-Lrn006Progress';
import { Lrn007RecommendationIndexes1700000006000 } from '@learning/database/migrations/1700000006000-Lrn007RecommendationIndexes';
import { Lrn002TestCaseManagement1700000007000 } from '@learning/database/migrations/1700000007000-Lrn002TestCaseManagement';
import { Lrn003CourseManagement1700000008000 } from '@learning/database/migrations/1700000008000-Lrn003CourseManagement';
import { DuplicateCourseSlugError } from '@learning/modules/courses/application/errors/application-errors';
import {
  courseWithProblem,
  draftCourse,
  OWNER_ID,
  PROBLEM_ID,
} from '@learning/modules/courses/testing/course-test.fakes';
import { learningEntities } from '@learning/modules/learning.entities';
import type { ProblemReferenceReader } from '@learning/modules/problems/application/ports/out/problem-reference-reader.port.out';
import { DataSource } from 'typeorm';

import { CourseTypeOrmReferenceChecker } from './course-reference.checker';
import { CourseTypeOrmRepository } from './course.typeorm-repository';
import { CourseTypeOrmTransactionContext } from './course.typeorm-transaction-context';
import { CourseTypeOrmTransactionRunner } from './course.typeorm-transaction-runner';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DATABASE_NAME = TEST_DATABASE_URL
  ? decodeURIComponent(new URL(TEST_DATABASE_URL).pathname.replace(/^\//, ''))
  : '';

if (TEST_DATABASE_URL && !/(_test|_lrn001)$/.test(TEST_DATABASE_NAME)) {
  throw new Error(
    'TEST_DATABASE_URL must point to a database whose name ends with _test or _lrn001',
  );
}

const describeIntegration = TEST_DATABASE_URL ? describe : describe.skip;

if (!TEST_DATABASE_URL) {
  console.warn('TEST_DATABASE_URL is not set; skipping CourseTypeOrmRepository integration tests');
}

const problemReader: ProblemReferenceReader = {
  getProblemReference: () =>
    Promise.resolve({
      publishStatus: 'PUBLISHED' as const,
      isDeleted: false,
      createdBy: OWNER_ID,
    }),
};

let dataSource: DataSource;
let repository: CourseTypeOrmRepository;
let runner: CourseTypeOrmTransactionRunner;
let checker: CourseTypeOrmReferenceChecker;
let sequence = 0;

const nextSlug = (): string => `it-course-${Date.now()}-${(sequence += 1)}`;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describeIntegration('CourseTypeOrmRepository', () => {
  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: TEST_DATABASE_URL,
      entities: learningEntities,
      migrations: [
        InitialLearningSchema1700000003000,
        Lrn004ClassEnrollment1700000004000,
        Lrn001ProblemManagement1700000004000,
        Lrn006Progress1700000005000,
        Lrn007RecommendationIndexes1700000006000,
        Lrn002TestCaseManagement1700000007000,
        Lrn003CourseManagement1700000008000,
      ],
      synchronize: false,
    });
    await dataSource.initialize();
    await dataSource.runMigrations();

    const context = new CourseTypeOrmTransactionContext(dataSource);
    runner = new CourseTypeOrmTransactionRunner(dataSource, context);
    repository = new CourseTypeOrmRepository(context);
    checker = new CourseTypeOrmReferenceChecker(dataSource, problemReader);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('round-trips a course with ordered chapters and problem references', async () => {
    const course = courseWithProblem(PROBLEM_ID, nextSlug());
    await runner.run(() => repository.save(course));

    const loaded = await repository.findById(course.id.value);

    expect(loaded?.toSnapshot().chapters.map((c) => c.problemRefs.map((p) => p.value))).toEqual([
      [PROBLEM_ID],
    ]);
    expect(loaded?.slug.value).toBe(course.slug.value);
    expect(loaded?.status).toBe('DRAFT');
  });

  it('refuses writes outside a transaction', async () => {
    await expect(repository.save(draftCourse(nextSlug()))).rejects.toThrow(
      'Course write requires an active transaction',
    );
  });

  it('rolls back the whole unit of work when it fails', async () => {
    const course = draftCourse(nextSlug());

    await expect(
      runner.run(async () => {
        await repository.save(course);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await repository.findByIdIncludingDeleted(course.id.value)).toBeNull();
  });

  it('maps a UNIQUE (slug) violation to DuplicateCourseSlugError', async () => {
    const slug = nextSlug();
    await runner.run(() => repository.save(draftCourse(slug)));

    await expect(runner.run(() => repository.save(draftCourse(slug)))).rejects.toBeInstanceOf(
      DuplicateCourseSlugError,
    );
    expect(await repository.isSlugAvailable(slug)).toBe(false);
  });

  it('persists soft delete and restore through save', async () => {
    const course = courseWithProblem(PROBLEM_ID, nextSlug());
    course.publish();
    await runner.run(() => repository.save(course));

    await runner.run(async () => {
      const loaded = await repository.loadForUpdate(course.id.value);
      loaded!.softDelete(new Date());
      await repository.save(loaded!);
    });
    expect(await repository.findById(course.id.value)).toBeNull();
    expect((await repository.findByIdIncludingDeleted(course.id.value))?.isDeleted).toBe(true);
    expect(
      (await repository.listPublished({ page: 1, limit: 100 })).items.map((c) => c.id.value),
    ).not.toContain(course.id.value);

    await runner.run(async () => {
      const loaded = await repository.loadForUpdate(course.id.value, true);
      loaded!.restore(new Date());
      await repository.save(loaded!);
    });
    expect((await repository.findById(course.id.value))?.status).toBe('PUBLISHED');
  });

  it('serialises concurrent writers on the same course with a row lock', async () => {
    const course = draftCourse(nextSlug());
    await runner.run(() => repository.save(course));
    const events: string[] = [];

    const first = runner.run(async () => {
      await repository.loadForUpdate(course.id.value);
      events.push('first-locked');
      await sleep(400);
      events.push('first-commit');
    });
    await sleep(100);
    const second = runner.run(async () => {
      await repository.loadForUpdate(course.id.value);
      events.push('second-locked');
    });
    await Promise.all([first, second]);

    expect(events).toEqual(['first-locked', 'first-commit', 'second-locked']);
  });

  it('returns null from loadForUpdate for an unknown course', async () => {
    const result = await runner.run(() =>
      repository.loadForUpdate('00000000-0000-4000-8000-0000000000ee'),
    );

    expect(result).toBeNull();
  });

  it('cascades hard delete to chapters and chapter problems', async () => {
    const course = courseWithProblem(PROBLEM_ID, nextSlug());
    await runner.run(() => repository.save(course));

    const deleted = await runner.run(() => repository.hardDelete(course.id.value, OWNER_ID));

    expect(deleted).toBe(true);
    const rows: unknown[] = await dataSource.query(
      `SELECT 1 FROM "chapters" WHERE "course_id" = $1`,
      [course.id.value],
    );
    expect(rows).toHaveLength(0);
  });

  describe('CourseTypeOrmReferenceChecker.hasCourseReferences', () => {
    it('is false for an unreferenced course', async () => {
      const course = draftCourse(nextSlug());
      await runner.run(() => repository.save(course));

      expect(await checker.hasCourseReferences(course.id.value)).toBe(false);
    });

    it('is true when a class references the course', async () => {
      const course = draftCourse(nextSlug());
      await runner.run(() => repository.save(course));
      await dataSource.query(
        `INSERT INTO "classes" ("course_id", "join_code", "name", "lecturer_id") VALUES ($1, $2, 'Class A', $3)`,
        [course.id.value, `JC${Date.now()}${sequence}`.slice(0, 32), OWNER_ID],
      );

      expect(await checker.hasCourseReferences(course.id.value)).toBe(true);
    });

    it('is true when an assignment references the course', async () => {
      const course = draftCourse(nextSlug());
      await runner.run(() => repository.save(course));
      await dataSource.query(
        `INSERT INTO "assignments" ("title", "course_id", "lecturer_id") VALUES ('HW', $1, $2)`,
        [course.id.value, OWNER_ID],
      );

      expect(await checker.hasCourseReferences(course.id.value)).toBe(true);
    });
  });
});
