import type { JudgePackageResult } from '@learning/modules/problems/application/results/test-case.results';

import { ProblemsController } from './problems.controller';

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
});
