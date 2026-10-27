import { ApplicationError } from './application.error';
import { ConcurrentModificationError } from './concurrent-modification.error';
import { ForbiddenError } from './forbidden.error';
import { HarnessNotFoundError } from './harness-not-found.error';
import { ProblemNotFoundError } from './problem-not-found.error';
import { PublishNotReadyError } from './publish-not-ready.error';
import { TestCaseNotFoundError } from './test-case-not-found.error';
import { UnauthorizedError } from './unauthorized.error';
import { UnknownReferenceError } from './unknown-reference.error';

describe('application errors', () => {
  it('sets a stable code and class name on every application error', () => {
    const errors: readonly ApplicationError[] = [
      new UnauthorizedError(),
      new ForbiddenError(),
      new ProblemNotFoundError('problem-1'),
      new PublishNotReadyError([]),
      new ConcurrentModificationError(),
      new UnknownReferenceError([]),
      new TestCaseNotFoundError('case-1'),
      new HarnessNotFoundError('problem-1', 'python'),
    ];

    expect(errors.map((error) => error.code)).toEqual([
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'PROBLEM_NOT_FOUND',
      'PUBLISH_NOT_READY',
      'CONCURRENT_MODIFICATION',
      'UNKNOWN_REFERENCE',
      'TEST_CASE_NOT_FOUND',
      'HARNESS_NOT_FOUND',
    ]);
    expect(errors.map((error) => error.name)).toEqual([
      'UnauthorizedError',
      'ForbiddenError',
      'ProblemNotFoundError',
      'PublishNotReadyError',
      'ConcurrentModificationError',
      'UnknownReferenceError',
      'TestCaseNotFoundError',
      'HarnessNotFoundError',
    ]);
    expect(errors.every((error) => error instanceof ApplicationError)).toBe(true);
    expect(errors.every((error) => error instanceof Error)).toBe(true);
  });

  it('supports custom messages for unauthorized and forbidden errors', () => {
    expect(new UnauthorizedError('custom unauthorized').message).toBe('custom unauthorized');
    expect(new ForbiddenError('custom forbidden').message).toBe('custom forbidden');
  });

  it('keeps the problem id, publish issues and unknown references as payload', () => {
    const issues = [{ code: 'TITLE_REQUIRED', field: 'title', message: 'required' }];
    const references = [{ kind: 'topic' as const, id: 'topic-1' }];

    expect(new ProblemNotFoundError('problem-1').problemId).toBe('problem-1');
    expect(new PublishNotReadyError(issues).issues).toBe(issues);
    expect(new UnknownReferenceError(references).references).toBe(references);
  });
});
