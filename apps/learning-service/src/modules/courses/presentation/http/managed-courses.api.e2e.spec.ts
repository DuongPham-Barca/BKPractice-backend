import type { AddressInfo } from 'node:net';

import { CourseAuthorizationService } from '@learning/modules/courses/application/services/course-authorization.service';
import { CoursePublishReadinessService } from '@learning/modules/courses/application/services/course-publish-readiness.service';
import {
  AddChapterUseCase,
  RemoveChapterUseCase,
  ReorderChaptersUseCase,
  UpdateChapterUseCase,
} from '@learning/modules/courses/application/use-cases/chapter.use-cases';
import {
  HardDeleteCourseUseCase,
  HoldCourseUseCase,
  PublishCourseUseCase,
  RepublishCourseUseCase,
  RestoreCourseUseCase,
  SoftDeleteCourseUseCase,
} from '@learning/modules/courses/application/use-cases/course-lifecycle.use-cases';
import { CreateCourseUseCase } from '@learning/modules/courses/application/use-cases/create-course.use-case';
import {
  AddProblemToChapterUseCase,
  RemoveProblemFromChapterUseCase,
  ReorderProblemsInChapterUseCase,
} from '@learning/modules/courses/application/use-cases/problem-in-chapter.use-cases';
import {
  GetManagedCourseUseCase,
  GetPublishedCourseUseCase,
  ListManagedCoursesUseCase,
  ListPublishedCoursesUseCase,
  PreviewCourseUseCase,
} from '@learning/modules/courses/application/use-cases/read-course.use-cases';
import { UpdateCourseUseCase } from '@learning/modules/courses/application/use-cases/update-course.use-case';
import {
  COURSE_REFERENCE_CHECKER,
  COURSE_REPOSITORY,
  COURSE_TRANSACTION_RUNNER,
} from '@learning/modules/courses/course.tokens';
import { CourseReadiness } from '@learning/modules/courses/domain/services/course-readiness';
import {
  ALL_COURSE_PERMISSIONS,
  FakeReferenceChecker,
  InlineTransactionRunner,
  InMemoryCourseRepository,
  OTHER_ID,
  OWNER_ID,
  PROBLEM_ID,
} from '@learning/modules/courses/testing/course-test.fakes';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

import { ManagedCoursesController } from './managed-courses.controller';

interface ApiResponse {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

type Headers = Record<string, string>;

function headers(
  userId = OWNER_ID,
  roles = 'LECTURER',
  permissions = ALL_COURSE_PERMISSIONS.join(','),
): Headers {
  return {
    'content-type': 'application/json',
    'x-auth-user-id': userId,
    'x-auth-roles': roles,
    'x-auth-permissions': permissions,
  };
}

describe('Managed courses API', () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  let repository: InMemoryCourseRepository;
  let checker: FakeReferenceChecker;

  beforeAll(async () => {
    repository = new InMemoryCourseRepository();
    checker = new FakeReferenceChecker();
    const moduleRef = await Test.createTestingModule({
      controllers: [ManagedCoursesController],
      providers: [
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
        { provide: COURSE_REPOSITORY, useValue: repository },
        { provide: COURSE_REFERENCE_CHECKER, useValue: checker },
        { provide: COURSE_TRANSACTION_RUNNER, useValue: new InlineTransactionRunner() },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0, '127.0.0.1');
    const address = (app.getHttpServer() as { address(): AddressInfo | string | null }).address();
    if (address === null || typeof address === 'string') throw new Error('Expected a TCP port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    repository.store.clear();
    repository.saveCount = 0;
    checker.problems.clear();
    checker.referenced = false;
  });

  async function call(
    method: string,
    path: string,
    options: { headers?: Headers; body?: unknown } = {},
  ): Promise<ApiResponse> {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: options.headers ?? headers(),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text.length > 0 ? (JSON.parse(text) as Record<string, unknown>) : {},
    };
  }

  async function createCourse(slug = 'intro-c'): Promise<string> {
    const res = await call('POST', '/api/courses', { body: { slug, title: 'Intro C' } });
    expect(res.status).toBe(201);
    return res.body.id as string;
  }

  async function readyCourse(): Promise<string> {
    const id = await createCourse();
    const chapter = await call('POST', `/api/courses/${id}/chapters`, { body: { title: 'Ch 1' } });
    const chapterId = (chapter.body.chapters as Array<{ id: string }>)[0]!.id;
    checker.setProblem(PROBLEM_ID);
    const added = await call('POST', `/api/courses/${id}/chapters/${chapterId}/problems`, {
      body: { problemId: PROBLEM_ID },
    });
    expect(added.status).toBe(201);
    return id;
  }

  describe('response shape', () => {
    it('returns flat primitives, not value-object wrappers', async () => {
      const res = await call('POST', '/api/courses', {
        body: { slug: 'intro-c', title: 'Intro C' },
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        slug: 'intro-c',
        title: 'Intro C',
        description: null,
        status: 'DRAFT',
        deletedAt: null,
        createdBy: OWNER_ID,
        chapters: [],
      });
      expect(typeof res.body.id).toBe('string');
    });

    it('lists managed courses without leaking aggregate internals', async () => {
      await createCourse();

      const res = await call('GET', '/api/courses/managed');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 1, page: 1, limit: 20 });
      const [item] = res.body.items as Array<Record<string, unknown>>;
      expect(item).toHaveProperty('slug', 'intro-c');
      expect(Object.keys(item!).some((key) => key.startsWith('_'))).toBe(false);
    });
  });

  describe('authentication and authorization', () => {
    it('returns 401 without a trusted principal', async () => {
      const res = await call('POST', '/api/courses', {
        headers: { 'content-type': 'application/json' },
        body: { slug: 'x', title: 'X' },
      });

      expect(res.status).toBe(401);
      expect(repository.saveCount).toBe(0);
    });

    it('returns 401 for a malformed user id', async () => {
      const res = await call('GET', '/api/courses/managed', { headers: headers('not-a-uuid') });

      expect(res.status).toBe(401);
    });

    it('returns 403 for a missing permission and for a non-lecturer role', async () => {
      const noPermission = await call('POST', '/api/courses', {
        headers: headers(OWNER_ID, 'LECTURER', 'course:read-managed'),
        body: { slug: 'x', title: 'X' },
      });
      const studentWithPermission = await call('POST', '/api/courses', {
        headers: headers(OTHER_ID, 'STUDENT', 'course:create'),
        body: { slug: 'x', title: 'X' },
      });

      expect(noPermission.status).toBe(403);
      expect(studentWithPermission.status).toBe(403);
      expect(repository.saveCount).toBe(0);
    });

    it('returns 403 when another lecturer touches a course they do not own', async () => {
      const id = await createCourse();

      const res = await call('PATCH', `/api/courses/${id}`, {
        headers: headers(OTHER_ID),
        body: { title: 'Hijacked' },
      });

      expect(res.status).toBe(403);
    });

    it('ignores x-auth-* headers sent twice (duplicate header smuggling)', async () => {
      const res = await fetch(`${baseUrl}/api/courses/managed`, {
        headers: [
          ['x-auth-user-id', OWNER_ID],
          ['x-auth-user-id', OTHER_ID],
          ['x-auth-roles', 'LECTURER'],
          ['x-auth-permissions', 'course:read-managed'],
        ],
      });

      expect(res.status).toBe(401);
    });
  });

  describe('error mapping', () => {
    it('returns 400 for an invalid path id and for invalid body data', async () => {
      expect((await call('GET', '/api/courses/managed/not-a-uuid')).status).toBe(400);
      expect(
        (await call('POST', '/api/courses', { body: { slug: 'x', title: '   ' } })).status,
      ).toBe(400);
    });

    it('rejects unknown, missing and mistyped body fields with 400 and details', async () => {
      const unknownField = await call('POST', '/api/courses', {
        body: { slug: 'x', title: 'X', createdBy: OTHER_ID, status: 'PUBLISHED' },
      });
      const missingTitle = await call('POST', '/api/courses', { body: { slug: 'x' } });
      const wrongType = await call('POST', '/api/courses', { body: { slug: 1, title: 'X' } });

      for (const res of [unknownField, missingTitle, wrongType]) {
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.message)).toBe(true);
      }
      expect(repository.saveCount).toBe(0);
    });

    it('rejects invalid pagination and malformed order payloads with 400', async () => {
      const id = await createCourse();

      expect((await call('GET', '/api/courses?page=0')).status).toBe(400);
      expect((await call('GET', '/api/courses?limit=1000')).status).toBe(400);
      expect(
        (await call('PUT', `/api/courses/${id}/chapters/order`, { body: { orderedIds: ['x'] } }))
          .status,
      ).toBe(400);
      expect(
        (
          await call('POST', `/api/courses/${id}/chapters/${PROBLEM_ID}/problems`, {
            body: { problemId: 'not-a-uuid' },
          })
        ).status,
      ).toBe(400);
    });

    it('hides soft-deleted courses unless includeDeleted=true', async () => {
      const id = await readyCourse();
      await call('POST', `/api/courses/${id}/publish`);
      await call('DELETE', `/api/courses/${id}`);

      expect((await call('GET', `/api/courses/managed/${id}`)).status).toBe(404);
      const shown = await call('GET', `/api/courses/managed/${id}?includeDeleted=true`);
      expect(shown.status).toBe(200);
      expect(shown.body.deletedAt).not.toBeNull();
      expect((await call('GET', '/api/courses/managed')).body.total).toBe(0);
      expect((await call('GET', '/api/courses/managed?includeDeleted=true')).body.total).toBe(1);
    });

    it('returns 409 for a duplicate slug and creates nothing (AC-011)', async () => {
      await createCourse('same-slug');

      const res = await call('POST', '/api/courses', {
        body: { slug: 'same-slug', title: 'Other' },
      });

      expect(res.status).toBe(409);
      expect(repository.store.size).toBe(1);
    });

    it('returns 404 for an unknown course', async () => {
      const res = await call('PATCH', '/api/courses/00000000-0000-4000-8000-0000000000ff', {
        body: { title: 'X' },
      });

      expect(res.status).toBe(404);
    });

    it('returns 400 with issues when publishing a course that is not ready', async () => {
      const id = await createCourse();

      const res = await call('POST', `/api/courses/${id}/publish`);

      expect(res.status).toBe(400);
      expect(res.body.issues).toEqual(expect.arrayContaining(['CHAPTER_REQUIRED']));
    });

    it('returns 409 for an invalid state transition', async () => {
      const id = await createCourse();

      const res = await call('POST', `/api/courses/${id}/hold`);

      expect(res.status).toBe(409);
    });

    it('does not leak internal error messages as 500s', async () => {
      const id = await createCourse();
      jest.spyOn(repository, 'save').mockRejectedValueOnce(new Error('connection string secret'));

      const res = await call('PATCH', `/api/courses/${id}`, { body: { title: 'X' } });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Internal server error');
    });
  });

  describe('publish readiness regression', () => {
    it('refuses to publish when the attached problem is not published', async () => {
      const id = await readyCourse();
      checker.setProblem(PROBLEM_ID, { publishStatus: 'DRAFT' });

      const res = await call('POST', `/api/courses/${id}/publish`);

      expect(res.status).toBe(400);
      expect(res.body.issues).toEqual(['PUBLISHED_PROBLEM_REQUIRED']);
    });

    it('publishes, holds, republishes, soft-deletes and restores end to end', async () => {
      const id = await readyCourse();

      expect((await call('POST', `/api/courses/${id}/publish`)).body.status).toBe('PUBLISHED');
      expect((await call('POST', `/api/courses/${id}/hold`)).body.status).toBe('ON_HOLD');
      expect((await call('POST', `/api/courses/${id}/republish`)).body.status).toBe('PUBLISHED');

      const deleted = await call('DELETE', `/api/courses/${id}`);
      expect(deleted.status).toBe(200);
      expect(deleted.body.deletedAt).not.toBeNull();

      const restored = await call('POST', `/api/courses/${id}/restore`);
      expect(restored.body).toMatchObject({ status: 'PUBLISHED', deletedAt: null });
    });

    it('serves published courses to any authenticated reader without drafts', async () => {
      const id = await readyCourse();
      await createCourse('draft-only');
      await call('POST', `/api/courses/${id}/publish`);

      const list = await call('GET', '/api/courses');
      expect(list.status).toBe(200);
      expect((list.body.items as unknown[]).length).toBe(1);
      expect((await call('GET', `/api/courses/${id}`)).body.id).toBe(id);
    });
  });

  describe('hard delete', () => {
    it('returns 204 for an unreferenced draft and 409 when referenced', async () => {
      const id = await createCourse();
      checker.referenced = true;
      expect((await call('DELETE', `/api/courses/${id}/hard`)).status).toBe(409);

      checker.referenced = false;
      expect((await call('DELETE', `/api/courses/${id}/hard`)).status).toBe(204);
    });

    it('returns 409 (not 404) for a published course', async () => {
      const id = await readyCourse();
      await call('POST', `/api/courses/${id}/publish`);

      expect((await call('DELETE', `/api/courses/${id}/hard`)).status).toBe(409);
    });
  });
});
