import {
  SubmissionKind as DomainSubmissionKind,
  SubmissionStatus as DomainSubmissionStatus,
} from '../domain/submission-record';

import {
  SubmissionKind as EntitySubmissionKind,
  SubmissionStatus as EntitySubmissionStatus,
} from './submission.entity';

describe('Submission persistence enum compatibility', () => {
  it('uses the domain enums as its single source of truth', () => {
    expect(EntitySubmissionKind).toBe(DomainSubmissionKind);
    expect(EntitySubmissionStatus).toBe(DomainSubmissionStatus);
    expect(EntitySubmissionStatus.Executed).toBe('EXECUTED');
  });
});
