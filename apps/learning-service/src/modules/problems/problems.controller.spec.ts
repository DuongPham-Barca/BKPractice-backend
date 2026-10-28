import type { AddressInfo } from 'node:net';

import { ProblemNotFoundError } from '@learning/modules/problems/application/errors/problem-not-found.error';
import { BUILD_JUDGE_PACKAGE_PORT_IN } from '@learning/modules/problems/application/ports/in/build-judge-package.port.in';
import type { JudgePackageResult } from '@learning/modules/problems/application/results/test-case.results';
import { DomainValidationError } from '@learning/modules/problems/domain/errors/domain-validation.error';
import { InvalidProblemState } from '@learning/modules/problems/domain/errors/invalid-problem-state.error';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

import { InternalServiceGuard } from './internal-service.guard';
import { ProblemsController } from './problems.controller';

const PROBLEM_ID = '00000000-0000-4000-8000-000000000001';

describe('ProblemsController', () => {
  it('delegates the judge package request to the application port', async () => {
    const result: JudgePackageResult = {
      problemId: '00000000-0000-4000-8000-000000000001',
      problemType: 'FUNCTION',
      timeLimitMs: 1_000,
      memoryLimitMb: 256,
      hiddenHarness: 'secret-harness',
      testCases: [{ id: 'case-1', stdin: '1 2', expectedOutput: '3', score: 10 }],
    };
    const useCase = { execute: jest.fn().mockResolvedValue(result) };
    const controller = new ProblemsController(useCase);

    await expect(
      controller.judgePackage('00000000-0000-4000-8000-000000000001', 'python'),
    ).resolves.toBe(result);
    expect(useCase.execute).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', 'python');
  });

  describe('error mapping', () => {
    let app: NestExpressApplication;
    let baseUrl: string;
    const useCase = { execute: jest.fn() };

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [ProblemsController],
        providers: [{ provide: BUILD_JUDGE_PACKAGE_PORT_IN, useValue: useCase }],
      })
        .overrideGuard(InternalServiceGuard)
        .useValue({ canActivate: () => true })
        .compile();

      app = moduleRef.createNestApplication<NestExpressApplication>();
      await app.listen(0, '127.0.0.1');

      const address = (app.getHttpServer() as { address(): AddressInfo | string | null }).address();

      if (address === null || typeof address === 'string') {
        throw new Error('Expected an ephemeral TCP port');
      }

      baseUrl = `http://127.0.0.1:${address.port}/internal/problems`;
    });

    afterAll(async () => {
      await app.close();
    });

    it.each([
      ['a missing or ineligible problem', new ProblemNotFoundError(PROBLEM_ID), 404],
      ['a harness-less FUNCTION problem', new InvalidProblemState('harness', 'missing'), 409],
      ['an unsupported language', new DomainValidationError('language', 'invalid'), 400],
    ])('maps %s to its HTTP status instead of 500', async (_name, error, status) => {
      useCase.execute.mockRejectedValueOnce(error);

      const response = await fetch(`${baseUrl}/${PROBLEM_ID}/judge-package/python`);

      expect(response.status).toBe(status);
    });
  });
});
