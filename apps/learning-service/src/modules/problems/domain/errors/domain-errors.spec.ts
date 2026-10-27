import { DomainValidationError } from './domain-validation.error';
import { DuplicateSlugError } from './duplicate-slug.error';
import { InvalidProblemState } from './invalid-problem-state.error';

describe('domain errors', () => {
  it('exposes the field and message for DomainValidationError', () => {
    const error = new DomainValidationError('title', 'A title is required');

    expect(error.code).toBe('DOMAIN_VALIDATION');
    expect(error.name).toBe('DomainValidationError');
    expect(error.field).toBe('title');
    expect(error.message).toBe('A title is required');
    expect(error).toBeInstanceOf(Error);
  });

  it('exposes the slug for DuplicateSlugError', () => {
    const error = new DuplicateSlugError('two-sum');

    expect(error.code).toBe('DUPLICATE_SLUG');
    expect(error.name).toBe('DuplicateSlugError');
    expect(error.slug).toBe('two-sum');
    expect(error.message).toBe('A problem with slug "two-sum" already exists');
    expect(error).toBeInstanceOf(Error);
  });

  it('exposes the state for InvalidProblemState', () => {
    const error = new InvalidProblemState('publishStatus', 'Cannot publish');

    expect(error.code).toBe('INVALID_PROBLEM_STATE');
    expect(error.name).toBe('InvalidProblemState');
    expect(error.state).toBe('publishStatus');
    expect(error.message).toBe('Cannot publish');
    expect(error).toBeInstanceOf(Error);
  });
});
