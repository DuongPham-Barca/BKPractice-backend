import {
  ExpectedOutput,
  TestCaseInput,
  TestCaseScore,
  TestCaseVisibility,
} from '@learning/modules/problems/domain/value-objects';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { ManagedTestCasesController } from './managed-test-cases.controller';
import { ProblemRequestMapper } from './mappers/problem-request.mapper';

const PROBLEM_ID = '00000000-0000-4000-8000-000000000001';
const CASE_ID = '00000000-0000-4000-8000-000000000011';
const PRINCIPAL = { userId: 'user-1', roles: ['LECTURER'], permissions: [] };

describe('ManagedTestCasesController routes', () => {
  it('keeps managed reads under the managed prefix', () => {
    expect(routeOf('list')).toEqual(['managed/:id/test-cases', RequestMethod.GET]);
    expect(routeOf('get')).toEqual(['managed/:id/test-cases/:testCaseId', RequestMethod.GET]);
    expect(routeOf('getHarnessForLanguage')).toEqual([
      'managed/:id/harnesses/:language',
      RequestMethod.GET,
    ]);
  });

  it('writes test cases and harnesses without the managed prefix', () => {
    expect(routeOf('add')).toEqual([':id/test-cases', RequestMethod.POST]);
    expect(routeOf('update')).toEqual([':id/test-cases/:testCaseId', RequestMethod.PATCH]);
    expect(routeOf('remove')).toEqual([':id/test-cases/:testCaseId', RequestMethod.DELETE]);
    expect(routeOf('reorder')).toEqual([':id/test-cases/order', RequestMethod.PUT]);
    expect(routeOf('setHarnessForLanguage')).toEqual([
      ':id/harnesses/:language',
      RequestMethod.PUT,
    ]);
    expect(routeOf('removeHarnessForLanguage')).toEqual([
      ':id/harnesses/:language',
      RequestMethod.DELETE,
    ]);
  });
});

describe('ManagedTestCasesController transport', () => {
  it('maps the list result into the list response', async () => {
    const useCases = controllerUseCases();
    const controller = createController(useCases);
    const result = {
      items: [
        {
          id: CASE_ID,
          input: '1 2',
          expectedOutput: '3',
          visibility: 'HIDDEN' as const,
          score: 5,
          displayOrder: 0,
        },
      ],
      testSuiteSummary: {
        totalCount: 1,
        hiddenCount: 1,
        totalScore: 5,
        totalBytes: 3,
        harnessLanguages: [],
      },
    };
    useCases.listTestCases.execute.mockResolvedValue(result);

    await expect(controller.list(PRINCIPAL, PROBLEM_ID)).resolves.toEqual(result);
  });

  it('maps an add request through the request mapper and delegates once', async () => {
    const useCases = controllerUseCases();
    const controller = createController(useCases);
    const result = {
      id: CASE_ID,
      input: '',
      expectedOutput: '3',
      visibility: 'HIDDEN' as const,
      score: 5,
      displayOrder: 0,
    };
    useCases.addTestCase.execute.mockResolvedValue(result);

    await expect(
      controller.add(PRINCIPAL, PROBLEM_ID, { expectedOutput: '3', score: 5 }),
    ).resolves.toBe(result);
    expect(useCases.addTestCase.execute).toHaveBeenCalledWith(PRINCIPAL, PROBLEM_ID, {
      input: new TestCaseInput(''),
      expectedOutput: new ExpectedOutput('3'),
      visibility: new TestCaseVisibility('HIDDEN'),
      score: new TestCaseScore(5),
    });
  });
});

function routeOf(method: keyof ManagedTestCasesController): [string, RequestMethod] {
  const target = ManagedTestCasesController.prototype[method] as object;

  return [
    Reflect.getMetadata(PATH_METADATA, target) as string,
    Reflect.getMetadata(METHOD_METADATA, target) as RequestMethod,
  ];
}

function controllerUseCases() {
  return {
    addTestCase: { execute: jest.fn() },
    updateTestCase: { execute: jest.fn() },
    removeTestCase: { execute: jest.fn() },
    reorderTestCases: { execute: jest.fn() },
    listTestCases: { execute: jest.fn() },
    getTestCase: { execute: jest.fn() },
    setHarness: { execute: jest.fn() },
    removeHarness: { execute: jest.fn() },
    getHarness: { execute: jest.fn() },
  };
}

function createController(
  useCases: ReturnType<typeof controllerUseCases>,
): ManagedTestCasesController {
  return new ManagedTestCasesController(
    useCases.addTestCase,
    useCases.updateTestCase,
    useCases.removeTestCase,
    useCases.reorderTestCases,
    useCases.listTestCases,
    useCases.getTestCase,
    useCases.setHarness,
    useCases.removeHarness,
    useCases.getHarness,
    new ProblemRequestMapper(),
  );
}
