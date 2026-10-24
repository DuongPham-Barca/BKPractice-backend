import type { SupportedLanguage } from '@app/contracts';

import { Problem, type CreateProblemInput, type ProblemSnapshot } from '../problem.aggregate';
import {
  CreatedBy,
  DeletedMarker,
  EnabledLanguage,
  ExecutionLimits,
  FunctionContract,
  InputSpecification,
  OopContract,
  OutputSpecification,
  ProblemId,
  ProblemStatement,
  ProblemTitle,
  Slug,
  StarterCode,
  VisibleExample,
} from '../value-objects';

export const TEST_PROBLEM_ID = '00000000-0000-4000-8000-000000000001';
export const TEST_USER_ID = '00000000-0000-4000-8000-000000000002';
export const TEST_NOW = new Date('2026-01-01T00:00:00.000Z');

export function buildProblem(overrides: Partial<CreateProblemInput> = {}): Problem {
  const input: CreateProblemInput = {
    slug: new Slug('two-sum'),
    title: new ProblemTitle('Two Sum'),
    statement: new ProblemStatement('Given an array, return the indices of two numbers.'),
    inputSpecification: new InputSpecification('An array of integers and a target.'),
    outputSpecification: new OutputSpecification('Two indices.'),
    problemType: 'STANDARD',
    difficulty: 'EASY',
    executionLimits: new ExecutionLimits({ timeLimitMs: 1_000, memoryLimitMb: 256 }),
    createdBy: new CreatedBy(TEST_USER_ID),
    ...overrides,
  };

  return Problem.create(input, {
    id: ProblemId.from(TEST_PROBLEM_ID),
    now: TEST_NOW,
  });
}

export function languages(...values: SupportedLanguage[]): readonly EnabledLanguage[] {
  return values.map((value) => new EnabledLanguage(value));
}

export function starterCode(
  language: SupportedLanguage,
  sourceCode = 'print("hello")',
): StarterCode {
  return new StarterCode({ language, sourceCode });
}

export function functionContract(functionName = 'solve'): FunctionContract {
  return new FunctionContract({
    functionName,
    parameters: [{ name: 'values', type: 'number[]' }],
    returnType: 'number[]',
  });
}

export function oopContract(name = 'Solution'): OopContract {
  return new OopContract({
    structure: 'CLASS',
    name,
    methods: [
      {
        name: 'solve',
        access: 'PUBLIC',
        parameters: [{ name: 'values', type: 'number[]' }],
        returnType: 'number[]',
      },
    ],
  });
}

export function snapshotOf(problem: Problem): ProblemSnapshot {
  return {
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    statement: problem.statement,
    inputSpecification: problem.inputSpecification,
    outputSpecification: problem.outputSpecification,
    problemType: problem.problemType,
    difficulty: problem.difficulty,
    examples: problem.examples,
    constraints: problem.constraints,
    executionLimits: problem.executionLimits,
    topics: problem.topics,
    tags: problem.tags,
    enabledLanguages: problem.enabledLanguages,
    starterCodes: problem.starterCodes,
    functionContracts: problem.functionContracts,
    oopContracts: problem.oopContracts,
    publishStatus: problem.publishStatus,
    deletedMarker: DeletedMarker.from(problem.deletedAt),
    createdBy: problem.createdBy,
    createdAt: problem.createdAt,
    updatedAt: problem.updatedAt,
  };
}

export function example(input = 'input', output = 'output'): VisibleExample {
  return new VisibleExample({ input, output });
}
