import type { HttpService } from '@nestjs/axios';
import type { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosHeaders } from 'axios';
import { of, throwError } from 'rxjs';

import {
  JudgePackageUnavailableError,
  ProblemNotSubmittableError,
} from '../../domain/ports/learning-judge-package.port';

import { HttpLearningJudgePackageAdapter } from './http-learning-judge-package.adapter';

const config = {
  getOrThrow: jest.fn((key: string) =>
    key === 'LEARNING_INTERNAL_URL' ? 'http://learning:3002' : 'internal-secret',
  ),
} as unknown as ConfigService;

function axiosErrorWithStatus(status: number): AxiosError {
  return new AxiosError('request failed', undefined, undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { testCases: [{ expectedOutput: 'hidden' }] },
  });
}

describe('HttpLearningJudgePackageAdapter', () => {
  it('requests the package by problem and language with the internal secret', async () => {
    const judgePackage = {
      problemType: 'STANDARD',
      timeLimitMs: 1_000,
      memoryLimitMb: 64,
      testCases: [],
    };
    const http = { get: jest.fn().mockReturnValue(of({ data: judgePackage })) };

    const result = await new HttpLearningJudgePackageAdapter(
      http as unknown as HttpService,
      config,
    ).getPackage('6832170d-de82-41f7-a82c-57b71efbf55c', 'cpp');

    expect(result).toBe(judgePackage);
    expect(http.get).toHaveBeenCalledWith(
      'http://learning:3002/internal/problems/6832170d-de82-41f7-a82c-57b71efbf55c/judge-package/cpp',
      { headers: { 'x-internal-service-secret': 'internal-secret' }, timeout: 5_000 },
    );
  });

  it('turns a Learning 404 into ProblemNotSubmittableError without forwarding the body', async () => {
    const http = { get: jest.fn().mockReturnValue(throwError(() => axiosErrorWithStatus(404))) };

    const failure = new HttpLearningJudgePackageAdapter(
      http as unknown as HttpService,
      config,
    ).getPackage('6832170d-de82-41f7-a82c-57b71efbf55c', 'cpp');

    await expect(failure).rejects.toBeInstanceOf(ProblemNotSubmittableError);
    await expect(failure).rejects.not.toHaveProperty('response');
  });

  it.each([
    ['a 5xx', axiosErrorWithStatus(503)],
    ['a network error', new Error('ECONNREFUSED')],
  ])('turns %s into JudgePackageUnavailableError', async (_case, error) => {
    const http = { get: jest.fn().mockReturnValue(throwError(() => error)) };

    await expect(
      new HttpLearningJudgePackageAdapter(http as unknown as HttpService, config).getPackage(
        '6832170d-de82-41f7-a82c-57b71efbf55c',
        'cpp',
      ),
    ).rejects.toBeInstanceOf(JudgePackageUnavailableError);
  });
});
