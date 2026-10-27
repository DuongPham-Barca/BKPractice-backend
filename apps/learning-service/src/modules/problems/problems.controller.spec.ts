import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { Problem, StarterCode, TestCase } from './entities/problem.entity';
import { ProblemsController } from './problems.controller';

describe('ProblemsController', () => {
  it('returns a judge package with test cases and the hidden harness', async () => {
    const builder = starterCodeBuilder();
    const problems = { findOneBy: jest.fn().mockResolvedValue(problemEntity()) };
    const testCases = {
      find: jest.fn().mockResolvedValue([
        { id: 'case-1', input: '1 2', expectedOutput: '3', score: 10 },
        { id: 'case-2', input: '2 3', expectedOutput: '5', score: 20 },
      ]),
    };
    const starterCodes = { createQueryBuilder: jest.fn().mockReturnValue(builder) };
    const controller = createController({ problems, testCases, starterCodes });

    builder.getOne.mockResolvedValue({ hiddenHarness: 'secret-harness' });

    await expect(controller.judgePackage('problem-id', 'python')).resolves.toEqual({
      problemId: 'problem-id',
      problemType: 'STANDARD',
      timeLimitMs: 1_000,
      memoryLimitMb: 256,
      hiddenHarness: 'secret-harness',
      testCases: [
        { id: 'case-1', stdin: '1 2', expectedOutput: '3', score: 10 },
        { id: 'case-2', stdin: '2 3', expectedOutput: '5', score: 20 },
      ],
    });
    expect(problems.findOneBy).toHaveBeenCalledWith({ id: 'problem-id' });
    expect(testCases.find).toHaveBeenCalledWith({
      where: { problem: { id: 'problem-id' } },
      order: { displayOrder: 'ASC' },
    });
    expect(builder.where).toHaveBeenCalledWith('starter.problem_id = :id', { id: 'problem-id' });
    expect(builder.andWhere).toHaveBeenCalledWith('starter.language = :language', {
      language: 'python',
    });
  });

  it('leaves hiddenHarness undefined when no starter code exists', async () => {
    const builder = starterCodeBuilder();
    const problems = { findOneBy: jest.fn().mockResolvedValue(problemEntity()) };
    const testCases = { find: jest.fn().mockResolvedValue([]) };
    const starterCodes = { createQueryBuilder: jest.fn().mockReturnValue(builder) };
    const controller = createController({ problems, testCases, starterCodes });

    builder.getOne.mockResolvedValue(null);

    const judgePackage = await controller.judgePackage('problem-id', 'java');

    expect(judgePackage.hiddenHarness).toBeUndefined();
    expect(judgePackage.testCases).toEqual([]);
  });

  it('throws NotFoundException when the problem does not exist', async () => {
    const problems = { findOneBy: jest.fn().mockResolvedValue(null) };
    const controller = createController({ problems });

    await expect(controller.judgePackage('missing', 'python')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

function createController(dependencies: {
  problems?: { findOneBy: jest.Mock };
  testCases?: { find: jest.Mock };
  starterCodes?: { createQueryBuilder: jest.Mock };
}): ProblemsController {
  const {
    problems = { findOneBy: jest.fn() },
    testCases = { find: jest.fn() },
    starterCodes = { createQueryBuilder: jest.fn() },
  } = dependencies;

  return new ProblemsController(
    problems as unknown as Repository<Problem>,
    testCases as unknown as Repository<TestCase>,
    starterCodes as unknown as Repository<StarterCode>,
  );
}

function problemEntity() {
  return {
    id: 'problem-id',
    problemType: 'STANDARD',
    timeLimitMs: 1_000,
    memoryLimitMb: 256,
  };
}

function starterCodeBuilder() {
  return {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
}
