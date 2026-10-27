import type {
  SubmissionDetailRecord,
  SubmissionRepositoryPort,
} from '../domain/ports/submission-repository.port';
import { SubmissionKind, SubmissionStatus } from '../domain/submission-record';

import { GetSubmissionDetailUseCase } from './get-submission-detail.use-case';

const base: SubmissionDetailRecord = {
  id: '8df8af45-b62d-49d9-95fd-9d7ea2572760',
  publicId: '9d668220-ee26-4202-8f98-1fdd43e6d1db',
  userId: '12e4a132-dc96-49f2-966a-317098097301',
  problemId: null,
  kind: SubmissionKind.Run,
  language: 'python',
  sourceCode: 'print(42)',
  stdin: '',
  status: SubmissionStatus.Executed,
  score: 0,
  passedTests: null,
  totalTests: null,
  runtimeMs: 8,
  memoryKb: 2048,
  result: {
    stdout: '42\n',
    stderr: '',
    compileOutput: null,
    error: null,
  },
  createdAt: new Date('2026-10-21T04:00:00.000Z'),
  updatedAt: new Date('2026-10-21T04:00:01.000Z'),
};

describe('GetSubmissionDetailUseCase', () => {
  it('looks up by public ID and owner and returns a positive Run DTO with raw output', async () => {
    const repository = {
      findByPublicIdAndOwner: jest.fn().mockResolvedValue(base),
    } as unknown as jest.Mocked<SubmissionRepositoryPort>;

    const result = await new GetSubmissionDetailUseCase(repository).execute({
      ownerId: base.userId,
      publicIdOrLegacyId: base.publicId,
    });

    expect(repository.findByPublicIdAndOwner).toHaveBeenCalledWith(base.publicId, base.userId);
    expect(result).toEqual({
      id: base.publicId,
      kind: SubmissionKind.Run,
      problemId: null,
      problemTitle: null,
      language: 'python',
      sourceCodeSize: 9,
      status: SubmissionStatus.Executed,
      score: 0,
      passedTests: null,
      totalTests: null,
      runtimeMs: 8,
      memoryKb: 2048,
      createdAt: '2026-10-21T04:00:00.000Z',
      updatedAt: '2026-10-21T04:00:01.000Z',
      sourceCode: 'print(42)',
      compileOutput: null,
      error: null,
      stdout: '42\n',
      stderr: '',
    });
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('stdin');
  });

  it('never returns raw output for Submit', async () => {
    const submit = { ...base, kind: SubmissionKind.Submit };
    const repository = {
      findByPublicIdAndOwner: jest.fn().mockResolvedValue(submit),
    } as unknown as jest.Mocked<SubmissionRepositoryPort>;

    const result = await new GetSubmissionDetailUseCase(repository).execute({
      ownerId: submit.userId,
      publicIdOrLegacyId: submit.id,
    });

    expect(result).not.toHaveProperty('stdout');
    expect(result).not.toHaveProperty('stderr');
  });

  it('returns null for the same repository result used by missing and foreign records', async () => {
    const repository = {
      findByPublicIdAndOwner: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<SubmissionRepositoryPort>;

    await expect(
      new GetSubmissionDetailUseCase(repository).execute({
        ownerId: base.userId,
        publicIdOrLegacyId: base.publicId,
      }),
    ).resolves.toBeNull();
  });
});
