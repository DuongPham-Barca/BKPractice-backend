import type { SupportedLanguage } from '@app/contracts';

import { Problem } from '../problem.aggregate';
import {
  buildProblem,
  functionContract,
  languages,
  oopContract,
  snapshotOf,
  starterCode,
} from '../testing/problem-test.factory';
import type { FunctionContract, OopContract } from '../value-objects';

import { ProblemContractValidator } from './problem-contract.validator';

describe('ProblemContractValidator', () => {
  const validator = new ProblemContractValidator();

  it('accepts a STANDARD problem with both specifications', () => {
    expect(validator.validate(buildProblem({ enabledLanguages: languages('python') }))).toEqual([]);
  });

  it('requires both STANDARD specifications', () => {
    const issues = validator.validate(
      buildProblem({
        inputSpecification: null,
        outputSpecification: null,
        enabledLanguages: languages('python'),
      }),
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      'STANDARD_IO_REQUIRED',
      'STANDARD_IO_REQUIRED',
    ]);
  });

  it('requires a function contract and starter code for every enabled language', () => {
    const issues = validator.validate(
      buildProblem({
        problemType: 'FUNCTION',
        inputSpecification: null,
        outputSpecification: null,
        enabledLanguages: languages('python'),
      }),
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      'FUNCTION_CONTRACT_MISSING',
      'STARTER_CODE_MISSING',
    ]);
  });

  it('accepts a complete FUNCTION configuration', () => {
    const problem = buildProblem({
      problemType: 'FUNCTION',
      inputSpecification: null,
      outputSpecification: null,
      enabledLanguages: languages('python'),
      starterCodes: [starterCode('python')],
      functionContracts: new Map<SupportedLanguage, FunctionContract>([
        ['python', functionContract()],
      ]),
    });

    expect(validator.validate(problem)).toEqual([]);
  });

  it('requires an OOP contract and starter code for every enabled language', () => {
    const issues = validator.validate(
      buildProblem({
        problemType: 'OOP',
        inputSpecification: null,
        outputSpecification: null,
        enabledLanguages: languages('python'),
      }),
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      'OOP_CONTRACT_MISSING',
      'STARTER_CODE_MISSING',
    ]);
  });

  it('accepts a complete OOP configuration', () => {
    const problem = buildProblem({
      problemType: 'OOP',
      inputSpecification: null,
      outputSpecification: null,
      enabledLanguages: languages('python'),
      starterCodes: [starterCode('python')],
      oopContracts: new Map<SupportedLanguage, OopContract>([['python', oopContract()]]),
    });

    expect(validator.validate(problem)).toEqual([]);
  });

  it('requires at least one enabled language', () => {
    const issues = validator.validate(buildProblem({ enabledLanguages: [] }));

    expect(issues.map((issue) => issue.code)).toEqual(['ENABLED_LANGUAGE_REQUIRED']);
  });

  it('rejects contracts on a STANDARD problem from a rehydrated aggregate', () => {
    const snapshot = {
      ...snapshotOf(buildProblem({ enabledLanguages: languages('python') })),
      functionContracts: new Map<SupportedLanguage, FunctionContract>([
        ['python', functionContract()],
      ]),
    };

    const issues = validator.validate(Problem.rehydrate(snapshot));

    expect(issues.map((issue) => issue.code)).toEqual(['STANDARD_CONTRACT_NOT_ALLOWED']);
  });

  it('rejects OOP contracts on a FUNCTION problem from a rehydrated aggregate', () => {
    const problem = buildProblem({
      problemType: 'FUNCTION',
      inputSpecification: null,
      outputSpecification: null,
      enabledLanguages: languages('python'),
      starterCodes: [starterCode('python')],
      functionContracts: new Map<SupportedLanguage, FunctionContract>([
        ['python', functionContract()],
      ]),
    });
    const snapshot = {
      ...snapshotOf(problem),
      oopContracts: new Map<SupportedLanguage, OopContract>([['python', oopContract()]]),
    };

    const issues = validator.validate(Problem.rehydrate(snapshot));

    expect(issues.map((issue) => issue.code)).toEqual(['OOP_CONTRACT_NOT_ALLOWED']);
  });

  it('rejects function contracts on an OOP problem from a rehydrated aggregate', () => {
    const problem = buildProblem({
      problemType: 'OOP',
      inputSpecification: null,
      outputSpecification: null,
      enabledLanguages: languages('python'),
      starterCodes: [starterCode('python')],
      oopContracts: new Map<SupportedLanguage, OopContract>([['python', oopContract()]]),
    });
    const snapshot = {
      ...snapshotOf(problem),
      functionContracts: new Map<SupportedLanguage, FunctionContract>([
        ['python', functionContract()],
      ]),
    };

    const issues = validator.validate(Problem.rehydrate(snapshot));

    expect(issues.map((issue) => issue.code)).toEqual(['FUNCTION_CONTRACT_NOT_ALLOWED']);
  });

  it('rejects contracts and starter code for disabled languages', () => {
    const problem = buildProblem({
      problemType: 'FUNCTION',
      inputSpecification: null,
      outputSpecification: null,
      enabledLanguages: languages('python'),
      starterCodes: [starterCode('python')],
      functionContracts: new Map<SupportedLanguage, FunctionContract>([
        ['python', functionContract()],
      ]),
    });
    const snapshot = {
      ...snapshotOf(problem),
      functionContracts: new Map<SupportedLanguage, FunctionContract>([
        ['java', functionContract()],
      ]),
      starterCodes: [starterCode('java')],
    };

    const codes = validator.validate(Problem.rehydrate(snapshot)).map((issue) => issue.code);

    expect(codes).toContain('CONTRACT_LANGUAGE_DISABLED');
    expect(codes).toContain('STARTER_CODE_LANGUAGE_DISABLED');
    expect(codes).toContain('FUNCTION_CONTRACT_MISSING');
    expect(codes).toContain('STARTER_CODE_MISSING');
  });

  it('rejects an interface constructor contract from a rehydrated aggregate', () => {
    const problem = buildProblem({
      problemType: 'OOP',
      inputSpecification: null,
      outputSpecification: null,
      enabledLanguages: languages('python'),
      starterCodes: [starterCode('python')],
      oopContracts: new Map<SupportedLanguage, OopContract>([['python', oopContract()]]),
    });
    const invalidContract = {
      structure: 'INTERFACE',
      name: 'Solution',
      constructorContract: { access: 'PUBLIC', parameters: [] },
      methods: [],
    } as unknown as OopContract;
    const snapshot = {
      ...snapshotOf(problem),
      oopContracts: new Map<SupportedLanguage, OopContract>([['python', invalidContract]]),
    };

    const issues = validator.validate(Problem.rehydrate(snapshot));

    expect(issues.map((issue) => issue.code)).toContain('PROBLEM_TYPE_CONFIG_MISMATCH');
  });
});
