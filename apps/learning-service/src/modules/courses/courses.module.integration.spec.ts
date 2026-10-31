import type { AddressInfo } from 'node:net';

import { InitialLearningSchema1700000003000 } from '@learning/database/migrations/1700000003000-InitialLearningSchema';
import { Lrn001ProblemManagement1700000004000 } from '@learning/database/migrations/1700000004000-Lrn001ProblemManagement';
import { Lrn004ClassEnrollment1700000004000 } from '@learning/database/migrations/1700000004000-Lrn004ClassEnrollment';
import { Lrn006Progress1700000005000 } from '@learning/database/migrations/1700000005000-Lrn006Progress';
import { Lrn007RecommendationIndexes1700000006000 } from '@learning/database/migrations/1700000006000-Lrn007RecommendationIndexes';
import { Lrn002TestCaseManagement1700000007000 } from '@learning/database/migrations/1700000007000-Lrn002TestCaseManagement';
import { Lrn003CourseManagement1700000008000 } from '@learning/database/migrations/1700000008000-Lrn003CourseManagement';
import {
  ALL_COURSE_PERMISSIONS,
  OWNER_ID,
} from '@learning/modules/courses/testing/course-test.fakes';
import { learningEntities } from '@learning/modules/learning.entities';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoursesModule } from './courses.module';

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

const headers = {
  'content-type': 'application/json',
  'x-auth-user-id': OWNER_ID,
  'x-auth-roles': 'LECTURER',
  'x-auth-permissions': ALL_COURSE_PERMISSIONS.join(','),
};

describeIntegration('CoursesModule wiring (real PostgreSQL)', () => {
  let app: NestExpressApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ INTERNAL_SERVICE_SECRET: 'integration-test-only' })],
        }),
        TypeOrmModule.forRoot({
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
          migrationsRun: true,
          synchronize: false,
        }),
        CoursesModule,
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
    await app?.close();
  });

  const call = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: (text ? JSON.parse(text) : {}) as Record<string, unknown>,
    };
  };

  it('resolves every provider and serves the course lifecycle against the database', async () => {
    const slug = `wiring-${Date.now()}`;
    const created = await call('POST', '/api/courses', { slug, title: 'Wiring' });
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    expect((await call('POST', '/api/courses', { slug, title: 'Again' })).status).toBe(409);

    const chapter = await call('POST', `/api/courses/${id}/chapters`, { title: 'Ch 1' });
    expect(chapter.status).toBe(201);
    expect((chapter.body.chapters as unknown[]).length).toBe(1);

    const notReady = await call('POST', `/api/courses/${id}/publish`);
    expect(notReady.status).toBe(400);
    expect(notReady.body.issues).toContain('PUBLISHED_PROBLEM_REQUIRED');

    expect((await call('DELETE', `/api/courses/${id}`)).status).toBe(409);
    expect((await call('DELETE', `/api/courses/${id}/hard`)).status).toBe(204);
    expect((await call('GET', `/api/courses/managed/${id}`)).status).toBe(404);
  });
});
