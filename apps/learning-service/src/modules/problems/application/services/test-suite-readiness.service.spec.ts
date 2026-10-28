import type { PublishValidator } from '@learning/modules/problems/domain/services/publish.validator';
import { buildProblem } from '@learning/modules/problems/domain/testing/problem-test.factory';

import { PublishNotReadyError } from '../errors/publish-not-ready.error';

import { TestSuiteReadinessService } from './test-suite-readiness.service';

describe('TestSuiteReadinessService', () => {
  it('does not validate drafts', () => {
    const validator = { validate: jest.fn() };
    const service = new TestSuiteReadinessService(validator as unknown as PublishValidator);

    service.assertReadyWhenPublished(buildProblem());

    expect(validator.validate).not.toHaveBeenCalled();
  });

  it('accepts a published problem that is still ready', () => {
    const validator = { validate: jest.fn().mockReturnValue({ ready: true, issues: [] }) };
    const service = new TestSuiteReadinessService(validator as unknown as PublishValidator);
    const problem = buildProblem();
    problem.publish();

    expect(() => service.assertReadyWhenPublished(problem)).not.toThrow();
    expect(validator.validate).toHaveBeenCalledWith(problem, { slugAvailable: true });
  });

  it('rejects a published change that breaks readiness', () => {
    const issues = [{ code: 'TEST_CASE_HIDDEN_REQUIRED' as const, message: 'missing' }];
    const validator = { validate: jest.fn().mockReturnValue({ ready: false, issues }) };
    const service = new TestSuiteReadinessService(validator as unknown as PublishValidator);
    const problem = buildProblem();
    problem.publish();

    expect(() => service.assertReadyWhenPublished(problem)).toThrow(PublishNotReadyError);
  });
});
