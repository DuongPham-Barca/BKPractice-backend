import { DomainValidationError } from '@learning/modules/problems/domain/errors/domain-validation.error';
import {
  buildProblem,
  example,
} from '@learning/modules/problems/domain/testing/problem-test.factory';
import {
  Constraints,
  InputSpecification,
  OutputSpecification,
  ProblemStatement,
  VisibleExample,
} from '@learning/modules/problems/domain/value-objects';

import {
  ContentFormatValidator,
  EXAMPLE_FIELD_MAX_LENGTH,
  STATEMENT_MAX_LENGTH,
  TEXT_SECTION_MAX_LENGTH,
} from './content-format.validator';

describe('ContentFormatValidator', () => {
  const validator = new ContentFormatValidator();

  it('accepts ordinary Markdown and harmless HTML', () => {
    const problem = buildProblem({
      statement: new ProblemStatement(
        '# Two Sum\n\nUse **binary search**. See <https://example.com> and <strong>this</strong>.',
      ),
      inputSpecification: new InputSpecification('`n` is an integer.'),
      outputSpecification: new OutputSpecification('Return an array.'),
      examples: [
        new VisibleExample({
          input: '2 7 11 15',
          output: '0 1',
          explanation: 'Because `nums[0] + nums[1] == 9`.',
        }),
      ],
      constraints: new Constraints('2 <= n <= 10^4'),
    });

    expect(() => validator.assertSafe(problem)).not.toThrow();
  });

  it.each([
    ['script tag', '<script>alert(1)</script>'],
    ['unclosed script tag', 'text <script'],
    ['style tag', '<style>body { color: red; }</style>'],
    ['iframe tag', '<iframe src="x"></iframe>'],
    ['svg tag', '<svg></svg>'],
    ['event handler', '<img src=x onerror=alert(1)>'],
    ['javascript protocol', '[click](javascript:alert(1))'],
    ['vbscript protocol', '[click](vbscript:msgbox(1))'],
    ['data html protocol', '[click](data:text/html,<script>alert(1)</script>)'],
  ])('rejects %s', (_label, statement) => {
    const problem = buildProblem({ statement: new ProblemStatement(statement) });

    expect(() => validator.assertSafe(problem)).toThrow(DomainValidationError);
  });

  it('checks input and output specifications', () => {
    const inputProblem = buildProblem({
      inputSpecification: new InputSpecification('<iframe>'),
    });
    expect(() => validator.assertSafe(inputProblem)).toThrow(DomainValidationError);

    const outputProblem = buildProblem({
      outputSpecification: new OutputSpecification('onclick = alert(1)'),
    });
    expect(() => validator.assertSafe(outputProblem)).toThrow(DomainValidationError);
  });

  it('checks example fields and constraints', () => {
    const exampleProblem = buildProblem({
      examples: [
        new VisibleExample({
          input: 'safe input',
          output: 'safe output',
          explanation: '<script>alert(1)</script>',
        }),
      ],
    });
    expect(() => validator.assertSafe(exampleProblem)).toThrow(DomainValidationError);

    const constraintsProblem = buildProblem({
      constraints: new Constraints('[click](javascript:alert(1))'),
    });
    expect(() => validator.assertSafe(constraintsProblem)).toThrow(DomainValidationError);
  });

  it('checks the explanation field of every example', () => {
    const problem = buildProblem({
      examples: [
        example('input', 'output'),
        new VisibleExample({
          input: 'input',
          output: 'output',
          explanation: '<svg onload=alert(1)>',
        }),
      ],
    });

    expect(() => validator.assertSafe(problem)).toThrow(DomainValidationError);
  });

  it('enforces statement and section length limits', () => {
    const longStatement = buildProblem({
      statement: new ProblemStatement('a'.repeat(STATEMENT_MAX_LENGTH + 1)),
    });
    expect(() => validator.assertSafe(longStatement)).toThrow(DomainValidationError);

    const longSection = buildProblem({
      inputSpecification: new InputSpecification('a'.repeat(TEXT_SECTION_MAX_LENGTH + 1)),
    });
    expect(() => validator.assertSafe(longSection)).toThrow(DomainValidationError);
  });

  it('enforces example field length limits', () => {
    const problem = buildProblem({
      examples: [
        new VisibleExample({
          input: 'a'.repeat(EXAMPLE_FIELD_MAX_LENGTH + 1),
          output: 'output',
        }),
      ],
    });

    expect(() => validator.assertSafe(problem)).toThrow(DomainValidationError);
  });

  it('reports the unsafe field', () => {
    const problem = buildProblem({
      statement: new ProblemStatement('<script>alert(1)</script>'),
    });

    try {
      validator.assertSafe(problem);
      throw new Error('Expected assertSafe to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainValidationError);
      expect((error as DomainValidationError).field).toBe('statement');
    }
  });
});
