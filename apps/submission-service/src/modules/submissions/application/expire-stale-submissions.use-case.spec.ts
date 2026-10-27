import type { RealtimePort } from '../domain/ports/realtime.port';
import type {
  PersistedSubmissionRecord,
  SubmissionRepositoryPort,
} from '../domain/ports/submission-repository.port';
import { SubmissionKind, SubmissionStatus } from '../domain/submission-record';

import { ExpireStaleSubmissionsUseCase } from './expire-stale-submissions.use-case';

const now = new Date('2026-10-21T03:10:00.000Z');
const expiredRun: PersistedSubmissionRecord = {
  id: '0a003329-4002-40e4-a381-d6f01dc67dee',
  publicId: 'c74dc4ad-5681-4b09-820f-f31adade7aa4',
  userId: '01079e3b-7ae6-4568-8bf5-40ffc6f79934',
  problemId: null,
  kind: SubmissionKind.Run,
  language: 'java',
  sourceCode: 'class Main {}',
  stdin: '',
  status: SubmissionStatus.InternalError,
  createdAt: new Date('2026-10-21T03:00:00.000Z'),
  updatedAt: now,
};
const expiredSubmit: PersistedSubmissionRecord = {
  ...expiredRun,
  id: '5d2a6f0e-1c3b-4f7a-9e8d-2b1c0a9f8e71',
  publicId: '8e7d6c5b-4a39-4281-9f0e-1d2c3b4a5f61',
  problemId: '6832170d-de82-41f7-a82c-57b71efbf55c',
  kind: SubmissionKind.Submit,
};

describe('ExpireStaleSubmissionsUseCase', () => {
  it('expires Run and Submit at the inclusive ten-minute boundary and notifies each with its kind', async () => {
    const repository = {
      expireStaleSubmissions: jest.fn().mockResolvedValue([expiredRun, expiredSubmit]),
    } as unknown as jest.Mocked<SubmissionRepositoryPort>;
    const realtime = {
      publishResult: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<RealtimePort>;

    const count = await new ExpireStaleSubmissionsUseCase(repository, realtime).execute(now);

    expect(repository.expireStaleSubmissions).toHaveBeenCalledWith(
      new Date('2026-10-21T03:00:00.000Z'),
      now,
    );
    expect(realtime.publishResult).toHaveBeenCalledWith(expiredRun.userId, {
      submissionId: expiredRun.publicId,
      kind: SubmissionKind.Run,
      status: SubmissionStatus.InternalError,
      ready: true,
    });
    expect(realtime.publishResult).toHaveBeenCalledWith(expiredSubmit.userId, {
      submissionId: expiredSubmit.publicId,
      kind: SubmissionKind.Submit,
      status: SubmissionStatus.InternalError,
      ready: true,
    });
    expect(count).toBe(2);
  });
});
