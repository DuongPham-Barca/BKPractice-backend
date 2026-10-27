import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import type { GetSubmissionDetailUseCase } from '../application/get-submission-detail.use-case';
import type { ListSubmissionHistoryUseCase } from '../application/list-submission-history.use-case';
import type { SubmitCodeUseCase } from '../application/submit-code.use-case';
import {
  JudgePackageUnavailableError,
  ProblemNotSubmittableError,
} from '../domain/ports/learning-judge-package.port';
import { SubmissionKind, SubmissionStatus } from '../domain/submission-record';

import { SubmissionsController } from './submissions.controller';

function controllerWith(
  overrides: {
    listSubmissionHistory?: unknown;
    getSubmissionDetail?: unknown;
    submitCode?: unknown;
  } = {},
): SubmissionsController {
  return new SubmissionsController(
    (overrides.listSubmissionHistory ?? {}) as ListSubmissionHistoryUseCase,
    (overrides.getSubmissionDetail ?? {}) as GetSubmissionDetailUseCase,
    (overrides.submitCode ?? {}) as SubmitCodeUseCase,
  );
}

describe('SubmissionsController history', () => {
  const emptyPage = { items: [], total: 0, totalPages: 0, nextCursor: null };

  it('scopes the list to the trusted owner and passes a complete cursor through', async () => {
    const listSubmissionHistory = { execute: jest.fn().mockResolvedValue(emptyPage) };

    const page = await controllerWith({ listSubmissionHistory }).list('owner-id', {
      kind: SubmissionKind.Submit,
      cursor: '2026-10-27T06:00:00.123456Z',
      cursorId: 'b6a0c1f2-3d4e-4f5a-8b9c-0d1e2f3a4b5c',
      limit: 50,
    });

    expect(listSubmissionHistory.execute).toHaveBeenCalledWith({
      ownerId: 'owner-id',
      filter: { kind: SubmissionKind.Submit, problemId: undefined },
      cursor: {
        createdAt: '2026-10-27T06:00:00.123456Z',
        publicId: 'b6a0c1f2-3d4e-4f5a-8b9c-0d1e2f3a4b5c',
      },
      limit: 50,
    });
    expect(page).toEqual(emptyPage);
  });

  it('rejects the list without the trusted owner header', async () => {
    const listSubmissionHistory = { execute: jest.fn() };

    await expect(
      controllerWith({ listSubmissionHistory }).list(undefined, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(listSubmissionHistory.execute).not.toHaveBeenCalled();
  });
});

const submitBody = {
  problemId: '6832170d-de82-41f7-a82c-57b71efbf55c',
  language: 'python' as const,
  sourceCode: 'print(1)',
};

describe('SubmissionsController detail', () => {
  it('maps both missing and foreign detail records to the same 404', async () => {
    const getSubmissionDetail = { execute: jest.fn().mockResolvedValue(null) };
    const controller = controllerWith({ getSubmissionDetail });

    await expect(
      controller.get('owner-id', '93c160ad-dd5d-4c7f-a88a-c9c72d0ec4fd'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('SubmissionsController Submit', () => {
  it('returns only the allow-listed acceptance fields with the owner from the trusted header', async () => {
    const acceptance = {
      id: 'b6a0c1f2-3d4e-4f5a-8b9c-0d1e2f3a4b5c',
      kind: SubmissionKind.Submit,
      status: SubmissionStatus.Queued,
      problemId: submitBody.problemId,
      language: 'python',
      createdAt: new Date('2026-10-27T06:00:00.000Z'),
    };
    const submitCode = { execute: jest.fn().mockResolvedValue(acceptance) };

    const result = await controllerWith({ submitCode }).submit('owner-id', submitBody);

    expect(submitCode.execute).toHaveBeenCalledWith({ userId: 'owner-id', ...submitBody });
    expect(result).toEqual({ ...acceptance, createdAt: '2026-10-27T06:00:00.000Z' });
    expect(Object.keys(result).sort()).toEqual(
      ['id', 'kind', 'status', 'problemId', 'language', 'createdAt'].sort(),
    );
  });

  it('rejects Submit without the trusted owner header before invoking the use case', async () => {
    const submitCode = { execute: jest.fn() };

    await expect(
      controllerWith({ submitCode }).submit(undefined, submitBody),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(submitCode.execute).not.toHaveBeenCalled();
  });

  it.each([
    [new ProblemNotSubmittableError(), NotFoundException],
    [new JudgePackageUnavailableError(), ServiceUnavailableException],
  ])('maps %p to its HTTP error', async (error, expected) => {
    const submitCode = { execute: jest.fn().mockRejectedValue(error) };

    await expect(
      controllerWith({ submitCode }).submit('owner-id', submitBody),
    ).rejects.toBeInstanceOf(expected);
  });
});
