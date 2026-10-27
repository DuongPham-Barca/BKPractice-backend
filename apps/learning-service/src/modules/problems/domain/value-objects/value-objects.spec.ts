import { DomainValidationError } from '@learning/modules/problems/domain/errors/domain-validation.error';

import {
  CreatedBy,
  DeletedMarker,
  EnabledLanguage,
  ExecutionLimits,
  FunctionContract,
  InputSpecification,
  OopContract,
  ProblemId,
  ProblemTitle,
  Slug,
  StarterCode,
  VisibleExample,
  parseDifficulty,
  parseProblemType,
  parsePublishStatus,
  parseSupportedLanguage,
} from './index';

describe('Slug', () => {
  it.each(['two-sum', 'a', 'a1-b2'])('accepts %s', (value) => {
    expect(new Slug(value).value).toBe(value);
  });

  it.each(['Two Sum', 'two_sum', '-two', 'two-', '--', '', 'a'.repeat(221)])(
    'rejects %s',
    (value) => {
      expect(() => new Slug(value)).toThrow(DomainValidationError);
    },
  );
});

describe('ProblemTitle', () => {
  it('trims whitespace', () => {
    expect(new ProblemTitle('  Two Sum  ').value).toBe('Two Sum');
  });

  it.each(['', '   ', 'a'.repeat(201)])('rejects %s', (value) => {
    expect(() => new ProblemTitle(value)).toThrow(DomainValidationError);
  });
});

describe('VisibleExample', () => {
  it('trims input and output and normalizes an empty explanation to null', () => {
    const example = new VisibleExample({
      input: '  input  ',
      output: '  output  ',
      explanation: '   ',
    });

    expect(example).toEqual({ input: 'input', output: 'output', explanation: null });
  });

  it('treats a missing explanation as null', () => {
    expect(new VisibleExample({ input: 'input', output: 'output' }).explanation).toBeNull();
  });

  it('rejects an empty input', () => {
    expect(() => new VisibleExample({ input: '', output: 'output' })).toThrow(
      DomainValidationError,
    );
  });
});

describe('ExecutionLimits', () => {
  it.each([1, 10_000])('accepts time limit %i', (timeLimitMs) => {
    expect(new ExecutionLimits({ timeLimitMs, memoryLimitMb: 256 }).timeLimitMs).toBe(timeLimitMs);
  });

  it.each([0, 10_001])('rejects time limit %i', (timeLimitMs) => {
    expect(() => new ExecutionLimits({ timeLimitMs, memoryLimitMb: 256 })).toThrow(
      DomainValidationError,
    );
  });

  it.each([1, 1_024])('accepts memory limit %i', (memoryLimitMb) => {
    expect(new ExecutionLimits({ timeLimitMs: 1_000, memoryLimitMb }).memoryLimitMb).toBe(
      memoryLimitMb,
    );
  });

  it.each([0, 1_025])('rejects memory limit %i', (memoryLimitMb) => {
    expect(() => new ExecutionLimits({ timeLimitMs: 1_000, memoryLimitMb })).toThrow(
      DomainValidationError,
    );
  });
});

describe('contracts', () => {
  it('rejects duplicate function parameter names', () => {
    expect(
      () =>
        new FunctionContract({
          functionName: 'solve',
          parameters: [
            { name: 'values', type: 'number[]' },
            { name: 'values', type: 'number' },
          ],
          returnType: 'number[]',
        }),
    ).toThrow(DomainValidationError);
  });

  it('rejects duplicate oop method names', () => {
    expect(
      () =>
        new OopContract({
          structure: 'CLASS',
          name: 'Solution',
          methods: [
            {
              name: 'solve',
              access: 'PUBLIC',
              parameters: [],
              returnType: 'number[]',
            },
            {
              name: 'solve',
              access: 'PRIVATE',
              parameters: [],
              returnType: 'number',
            },
          ],
        }),
    ).toThrow(DomainValidationError);
  });

  it('rejects an interface constructor contract at the boundary', () => {
    expect(
      () =>
        new OopContract({
          structure: 'INTERFACE',
          name: 'Solution',
          constructorContract: { access: 'PUBLIC', parameters: [] },
          methods: [],
        }),
    ).toThrow(DomainValidationError);
  });
});

describe('optional sections', () => {
  it('rejects an empty input specification', () => {
    expect(() => new InputSpecification('')).toThrow(DomainValidationError);
  });
});

describe('identifiers and scalar value objects', () => {
  it('rejects an invalid problem id', () => {
    expect(() => ProblemId.from('not-a-uuid')).toThrow(DomainValidationError);
  });

  it('accepts a canonical problem id and compares by value', () => {
    const id = ProblemId.from('00000000-0000-4000-8000-000000000001');

    expect(id.equals(ProblemId.from(id.value))).toBe(true);
  });

  it('rejects an invalid createdBy id', () => {
    expect(() => new CreatedBy('not-a-uuid')).toThrow(DomainValidationError);
  });

  it('parses supported enums and rejects unknown values', () => {
    expect(parseProblemType('STANDARD')).toBe('STANDARD');
    expect(parseDifficulty('EASY')).toBe('EASY');
    expect(parsePublishStatus('DRAFT')).toBe('DRAFT');
    expect(parseSupportedLanguage('python')).toBe('python');

    expect(() => parseProblemType('UNKNOWN')).toThrow(DomainValidationError);
    expect(() => parseDifficulty('UNKNOWN')).toThrow(DomainValidationError);
    expect(() => parsePublishStatus('UNKNOWN')).toThrow(DomainValidationError);
    expect(() => parseSupportedLanguage('unknown')).toThrow(DomainValidationError);
  });

  it('rejects invalid languages and starter code', () => {
    expect(() => new EnabledLanguage('unknown')).toThrow(DomainValidationError);
    expect(() => new StarterCode({ language: 'python', sourceCode: '   ' })).toThrow(
      DomainValidationError,
    );
  });

  it('normalizes and copies deleted markers', () => {
    expect(DeletedMarker.none().isDeleted).toBe(false);
    expect(DeletedMarker.from(null).deletedAt).toBeNull();

    const date = new Date('2026-01-01T00:00:00.000Z');
    const marker = DeletedMarker.at(date);
    date.setUTCFullYear(2027);

    expect(marker.isDeleted).toBe(true);
    expect(marker.deletedAt?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});
