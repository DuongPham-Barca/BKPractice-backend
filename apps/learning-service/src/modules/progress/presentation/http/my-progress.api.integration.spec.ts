import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';

import { RabbitMqService } from '@app/common';
import { Global, Logger, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CoursesModule } from '@/modules/courses/courses.module';
import {
  assertTestDatabase,
  learningDataSourceOptions,
  TEST_DATABASE_URL,
  upsertProblem,
} from '@/modules/courses/testing';
import { ApplyAcceptedSubmissionUseCase } from '@/modules/progress/application/use-cases';
import { ProgressTypeOrmRepository } from '@/modules/progress/infrastructure/persistence';
import { ProgressModule } from '@/modules/progress/progress.module';

assertTestDatabase();
const describeIntegration = TEST_DATABASE_URL ? describe : describe.skip;

@Global()
@Module({
  providers: [
    { provide: RabbitMqService, useValue: { consume: jest.fn().mockResolvedValue(undefined) } },
  ],
  exports: [RabbitMqService],
})
class TestMessagingModule {}

const USER = randomUUID();
const OTHER_USER = randomUUID();
const COURSE = randomUUID();
const FIRST_CHAPTER = randomUUID();
const SECOND_CHAPTER = randomUUID();
const EMPTY_CHAPTER = randomUUID();
const A = 'f0060000-0000-4000-8000-000000000001';
const B = 'f0060000-0000-4000-8000-000000000002';
const HELD = 'f0060000-0000-4000-8000-000000000003';
const DELETED = 'f0060000-0000-4000-8000-000000000004';
const DRAFT = 'f0060000-0000-4000-8000-000000000005';
const UNKNOWN = 'f0060000-0000-4000-8000-000000000006';
const ATTEMPTED = 'f0060000-0000-4000-8000-000000000007';
const UNSOLVED = 'f0060000-0000-4000-8000-000000000008';
const OUTSIDE_COURSE = 'f0060000-0000-4000-8000-000000000009';
const PROBLEMS = [A, B, HELD, DELETED, DRAFT, ATTEMPTED, UNSOLVED, OUTSIDE_COURSE];
const SOLVED_AT = '2026-01-01T00:00:00.000Z';
const headers = (userId = USER, role = 'STUDENT') => ({
  'x-auth-user-id': userId,
  'x-auth-roles': role,
});
interface CourseResponse {
  courseId: string;
  solved: number;
  total: number;
  chapters: Array<{ chapterId: string; solved: number; total: number }>;
  solvedProblems: Array<{ problemId: string; solvedAt: string }>;
}

/** Real DI, SQL, migrations and HTTP; only the RabbitMQ transport is stubbed for read-side tests. */
describeIntegration('Personal progress API (PostgreSQL, pool=1)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let baseUrl: string;
  let repository: ProgressTypeOrmRepository;
  let applyAccepted: ApplyAcceptedSubmissionUseCase;

  async function call(
    path: string,
    requestHeaders: Record<string, string> = headers(),
    method = 'GET',
  ) {
    return fetch(`${baseUrl}${path}`, { headers: requestHeaders, method });
  }
  async function json<T>(path: string, requestHeaders = headers()): Promise<T> {
    const response = await call(path, requestHeaders);
    expect(response.status).toBe(200);
    return (await response.json()) as T;
  }

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ INTERNAL_SERVICE_SECRET: 'progress-test-only' })],
        }),
        TypeOrmModule.forRoot({
          ...learningDataSourceOptions({ extra: { max: 1, connectionTimeoutMillis: 1500 } }),
          migrationsRun: true,
        }),
        TestMessagingModule,
        ProgressModule,
        CoursesModule,
      ],
    }).compile();
    app = testingModule.createNestApplication<NestExpressApplication>();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0, '127.0.0.1');
    const address = (app.getHttpServer() as { address(): AddressInfo | string | null }).address();
    if (!address || typeof address === 'string') throw new Error('Expected a TCP port');
    baseUrl = `http://127.0.0.1:${address.port}`;
    dataSource = app.get(DataSource);
    repository = app.get(ProgressTypeOrmRepository);
    applyAccepted = app.get(ApplyAcceptedSubmissionUseCase);
    for (const id of PROBLEMS)
      await upsertProblem(dataSource, { id, slug: `progress-${id}`, title: `Problem ${id}` });
    await dataSource.query(
      `INSERT INTO courses (id, slug, title, created_by, status) VALUES ($1, $2, 'Progress Course', $3, 'PUBLISHED')`,
      [COURSE, `progress-${COURSE}`, OTHER_USER],
    );
    for (const [id, order] of [
      [SECOND_CHAPTER, 1],
      [EMPTY_CHAPTER, 2],
      [FIRST_CHAPTER, 0],
    ] as const) {
      await dataSource.query(
        `INSERT INTO chapters (id, course_id, title, display_order) VALUES ($1, $2, 'Chapter', $3)`,
        [id, COURSE, order],
      );
    }
    for (const [chapterId, ids] of [
      [FIRST_CHAPTER, [B, HELD, DELETED, DRAFT]],
      [SECOND_CHAPTER, [A, ATTEMPTED, UNSOLVED]],
    ] as const) {
      for (const [order, problemId] of ids.entries()) {
        await dataSource.query(
          `INSERT INTO chapter_problems (course_id, chapter_id, problem_id, display_order) VALUES ($1, $2, $3, $4)`,
          [COURSE, chapterId, problemId, order],
        );
      }
    }
    for (const problemId of [A, HELD, DELETED, DRAFT, OUTSIDE_COURSE]) {
      await applyAccepted.execute({
        eventId: randomUUID(),
        submissionId: randomUUID(),
        userId: USER,
        problemId,
        occurredAt:
          problemId === A || problemId === OUTSIDE_COURSE ? SOLVED_AT : '2026-02-01T00:00:00Z',
        score: 100,
      });
    }
    await applyAccepted.execute({
      eventId: randomUUID(),
      submissionId: randomUUID(),
      userId: OTHER_USER,
      problemId: B,
      occurredAt: SOLVED_AT,
      score: 100,
    });
    await dataSource.query(
      `INSERT INTO progress (user_id, problem_id, status, solved_at) VALUES ($1, $2, 'ATTEMPTED', '2026-02-01T00:00:00Z')`,
      [USER, ATTEMPTED],
    );
  }, 30000);

  beforeEach(async () => {
    await dataSource.query(
      `UPDATE problems SET publish_status = CASE WHEN id = $1 THEN 'ON_HOLD'::problems_publish_status_enum WHEN id = $2 THEN 'DRAFT'::problems_publish_status_enum ELSE 'PUBLISHED'::problems_publish_status_enum END, deleted_at = CASE WHEN id = $3 THEN now() ELSE NULL END WHERE id = ANY($4::uuid[])`,
      [HELD, DRAFT, DELETED, PROBLEMS],
    );
    await dataSource.query(
      `UPDATE courses SET status = 'PUBLISHED', deleted_at = NULL WHERE id = $1`,
      [COURSE],
    );
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
  });

  it('filters before pagination and total, with a stable tie-breaker for equal solve times', async () => {
    const first = await json<{ items: unknown[]; page: number; limit: number; total: number }>(
      '/api/progress/me/problems?page=1&limit=1',
    );
    expect(first).toEqual({
      items: [{ problemId: A, solvedAt: SOLVED_AT }],
      page: 1,
      limit: 1,
      total: 2,
    });
    expect(await json('/api/progress/me/problems?page=2&limit=1')).toEqual({
      items: [{ problemId: OUTSIDE_COURSE, solvedAt: SOLVED_AT }],
      page: 2,
      limit: 1,
      total: 2,
    });
    expect(await json('/api/progress/me/problems?page=3&limit=1')).toEqual({
      items: [],
      page: 3,
      limit: 1,
      total: 2,
    });
    expect(await json('/api/progress/me/problems')).toMatchObject({ page: 1, limit: 20, total: 2 });
  });

  it('returns status in input order and makes hidden/unknown/ATTEMPTED indistinguishable from unsolved', async () => {
    const ids = [DELETED, A, UNKNOWN, HELD, DRAFT, ATTEMPTED, B];
    expect(await json(`/api/progress/me/problems/status?problemIds=${ids.join(',')}`)).toEqual(
      ids.map((problemId) => ({
        problemId,
        solved: problemId === A,
        solvedAt: problemId === A ? SOLVED_AT : null,
      })),
    );
    expect(await json(`/api/progress/me/problems/status?problemIds=${A.toUpperCase()}`)).toEqual([
      { problemId: A, solved: true, solvedAt: SOLVED_AT },
    ]);
  });

  it('calculates Course and Chapter counts from exactly the visible Course API structure', async () => {
    const course = await json<{ chapters: Array<{ id: string; problems: Array<{ id: string }> }> }>(
      `/api/courses/${COURSE}`,
    );
    const progress = await json<CourseResponse>(`/api/progress/me/courses/${COURSE}`);
    expect(progress).toEqual({
      courseId: COURSE,
      solved: 1,
      total: 4,
      chapters: [
        { chapterId: FIRST_CHAPTER, solved: 0, total: 1 },
        { chapterId: SECOND_CHAPTER, solved: 1, total: 3 },
        { chapterId: EMPTY_CHAPTER, solved: 0, total: 0 },
      ],
      solvedProblems: [{ problemId: A, solvedAt: SOLVED_AT }],
    });
    expect(progress.chapters.map((chapter) => [chapter.chapterId, chapter.total])).toEqual(
      course.chapters.map((chapter) => [chapter.id, chapter.problems.length]),
    );
  });

  it('isolates users and grants ADMIN/LECTURER only access to their own progress', async () => {
    for (const role of ['ADMIN', 'LECTURER', 'STUDENT']) {
      expect(
        await json(`/api/progress/me/courses/${COURSE}`, headers(OTHER_USER, role)),
      ).toMatchObject({
        solved: 1,
        total: 4,
        solvedProblems: [{ problemId: B, solvedAt: SOLVED_AT }],
      });
    }
    expect(await json('/api/progress/me/problems', headers(OTHER_USER))).toMatchObject({
      items: [{ problemId: B, solvedAt: SOLVED_AT }],
      total: 1,
    });
    expect(await json(`/api/progress/me/courses/${COURSE}`, headers(randomUUID()))).toMatchObject({
      solved: 0,
      total: 4,
      solvedProblems: [],
    });
    expect((await call('/api/progress/me/problems', { 'x-auth-user-id': USER })).status).toBe(200);
  });

  it('hides and restores progress without requiring another submission', async () => {
    await dataSource.query(`UPDATE problems SET publish_status = 'ON_HOLD' WHERE id = $1`, [A]);
    expect(await json(`/api/progress/me/courses/${COURSE}`)).toMatchObject({
      solved: 0,
      total: 3,
      solvedProblems: [],
    });
    expect(await json(`/api/progress/me/problems/status?problemIds=${A}`)).toEqual([
      { problemId: A, solved: false, solvedAt: null },
    ]);
    await dataSource.query(`UPDATE problems SET publish_status = 'PUBLISHED' WHERE id = $1`, [A]);
    expect(await json(`/api/progress/me/courses/${COURSE}`)).toMatchObject({
      solved: 1,
      total: 4,
      solvedProblems: [{ problemId: A, solvedAt: SOLVED_AT }],
    });
    await dataSource.query(`UPDATE problems SET deleted_at = now() WHERE id = $1`, [A]);
    expect(await json(`/api/progress/me/courses/${COURSE}`)).toMatchObject({ solved: 0, total: 3 });
    await dataSource.query(`UPDATE problems SET deleted_at = NULL WHERE id = $1`, [A]);
    expect(await json(`/api/progress/me/courses/${COURSE}`)).toMatchObject({ solved: 1, total: 4 });
  });

  it('keeps progress when a Problem is removed from the Course', async () => {
    await dataSource.query(
      'DELETE FROM chapter_problems WHERE course_id = $1 AND problem_id = $2',
      [COURSE, A],
    );
    try {
      expect(await json(`/api/progress/me/courses/${COURSE}`)).toMatchObject({
        solved: 0,
        total: 3,
      });
      expect(await json('/api/progress/me/problems')).toMatchObject({ total: 2 });
    } finally {
      await dataSource.query(
        'INSERT INTO chapter_problems (course_id, chapter_id, problem_id, display_order) VALUES ($1, $2, $3, 0)',
        [COURSE, SECOND_CHAPTER, A],
      );
    }
  });

  it('returns valid 0/0 counts when every Course Problem is hidden', async () => {
    await dataSource.query(
      `UPDATE problems SET publish_status = 'ON_HOLD' WHERE id = ANY($1::uuid[])`,
      [[A, B, ATTEMPTED, UNSOLVED]],
    );
    const result = await json<CourseResponse>(`/api/progress/me/courses/${COURSE}`);
    expect(result).toMatchObject({ solved: 0, total: 0, solvedProblems: [] });
    expect(result.chapters).toHaveLength(3);
    expect(result.chapters.every((c) => c.total === 0 && c.solved === 0)).toBe(true);
  });

  it.each(['DRAFT', 'ON_HOLD', 'DELETED', 'UNKNOWN'])(
    'returns 404 for a %s Course',
    async (status) => {
      const id = status === 'UNKNOWN' ? randomUUID() : COURSE;
      if (status === 'DELETED')
        await dataSource.query('UPDATE courses SET deleted_at = now() WHERE id = $1', [COURSE]);
      else if (status !== 'UNKNOWN')
        await dataSource.query('UPDATE courses SET status = $1 WHERE id = $2', [status, COURSE]);
      expect((await call(`/api/progress/me/courses/${id}`)).status).toBe(404);
    },
  );

  it.each([
    '/api/progress/me/problems',
    `/api/progress/me/problems/status?problemIds=${A}`,
    `/api/progress/me/courses/${COURSE}`,
  ])('requires authentication for %s', async (path) => {
    expect((await call(path, {})).status).toBe(401);
    expect((await call(path, { 'x-auth-user-id': 'invalid' })).status).toBe(401);
  });

  it.each([
    '/api/progress/me/problems?page=0',
    '/api/progress/me/problems?page=1.5',
    '/api/progress/me/problems?limit=0',
    '/api/progress/me/problems?limit=101',
    `/api/progress/me/problems?userId=${OTHER_USER}`,
    '/api/progress/me/problems/status',
    '/api/progress/me/problems/status?problemIds=',
    '/api/progress/me/problems/status?problemIds=bad',
    `/api/progress/me/problems/status?problemIds=${A},${A.toUpperCase()}`,
    `/api/progress/me/problems/status?problemIds=${A}&problemIds=${B}`,
    `/api/progress/me/problems/status?problemIds=${A}&userId=${OTHER_USER}`,
    `/api/progress/me/problems/status?problemIds=${Array.from({ length: 101 }, () => randomUUID()).join(',')}`,
    '/api/progress/me/courses/bad',
    `/api/progress/me/courses/${COURSE}?userId=${OTHER_USER}`,
  ])('rejects invalid or impersonating query %s', async (path) => {
    expect((await call(path)).status).toBe(400);
  });

  it('accepts exactly 100 valid status ids', async () => {
    const ids = Array.from({ length: 100 }, () => randomUUID());
    const result = await json<
      Array<{ problemId: string; solved: boolean; solvedAt: string | null }>
    >(`/api/progress/me/problems/status?problemIds=${ids.join(',')}`);
    expect(result).toEqual(ids.map((problemId) => ({ problemId, solved: false, solvedAt: null })));
  });

  it('does not modify progress or receipts when reading and exposes only explicit response fields', async () => {
    const snapshot = async () => ({
      progress: await dataSource.query<unknown[]>(
        'SELECT * FROM progress WHERE user_id = $1 ORDER BY problem_id',
        [USER],
      ),
      receipts: await dataSource.query<unknown[]>(
        'SELECT * FROM progress_event_receipts WHERE user_id = $1 ORDER BY event_id',
        [USER],
      ),
    });
    const before = await snapshot();
    const list = await json<{ items: Array<Record<string, unknown>> }>('/api/progress/me/problems');
    const status = await json<Array<Record<string, unknown>>>(
      `/api/progress/me/problems/status?problemIds=${A}`,
    );
    const course = await json<CourseResponse>(`/api/progress/me/courses/${COURSE}`);
    expect(Object.keys(list.items[0]!).sort()).toEqual(['problemId', 'solvedAt']);
    expect(Object.keys(status[0]!).sort()).toEqual(['problemId', 'solved', 'solvedAt']);
    expect(Object.keys(course).sort()).toEqual([
      'chapters',
      'courseId',
      'solved',
      'solvedProblems',
      'total',
    ]);
    expect(await snapshot()).toEqual(before);
  });

  it('sanitizes unexpected database failures in both response and logs', async () => {
    const errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest
      .spyOn(repository, 'listSolved')
      .mockRejectedValueOnce(new Error('postgres://private-secret'));
    const response = await call('/api/progress/me/problems');
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ statusCode: 500, message: 'Internal server error' });
    expect(errorLog).toHaveBeenCalledWith('Unexpected error while reading personal progress');
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('private-secret');
  });

  it('documents exactly the three personal GET routes and exposes no write/class/assignment endpoints', async () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    const progressPaths = Object.keys(document.paths).filter((path) =>
      path.startsWith('/api/progress'),
    );
    expect(progressPaths.sort()).toEqual([
      '/api/progress/me/courses/{courseId}',
      '/api/progress/me/problems',
      '/api/progress/me/problems/status',
    ]);
    for (const path of progressPaths) {
      expect(Object.keys(document.paths[path]!)).toEqual(['get']);
      const operation = document.paths[path]!.get!;
      expect(operation.security).toEqual([{ bearer: [] }]);
      for (const status of ['200', '400', '401', '500']) {
        expect(operation.responses).toHaveProperty(status);
      }
    }
    expect((await call('/api/progress/me/problems', headers(), 'POST')).status).toBe(404);
    expect((await call(`/api/progress/classes/${COURSE}/course`)).status).toBe(404);
    expect((await call(`/api/progress/me/assignments/${COURSE}`)).status).toBe(404);
  });
});
