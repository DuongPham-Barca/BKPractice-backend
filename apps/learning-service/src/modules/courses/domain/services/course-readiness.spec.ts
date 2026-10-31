import {
  courseWithProblem,
  draftCourse,
  OWNER_ID,
  OTHER_ID,
  PROBLEM_ID,
} from '@learning/modules/courses/testing/course-test.fakes';

import { DomainValidationError } from '../errors/domain-validation.error';

import { CourseReadiness, ProblemAttachPolicy } from './course-readiness';
import type { ProblemStateForReadiness } from './course-readiness';

const state = (overrides: Partial<ProblemStateForReadiness> = {}): ProblemStateForReadiness => ({
  problemId: PROBLEM_ID,
  publishStatus: 'PUBLISHED',
  isDeleted: false,
  ...overrides,
});

describe('CourseReadiness', () => {
  const readiness = new CourseReadiness();

  it('is ready with a title, a chapter and a published, non-deleted problem', () => {
    expect(readiness.check(courseWithProblem(), [state()])).toEqual([]);
    expect(readiness.isReady(courseWithProblem(), [state()])).toBe(true);
  });

  it('reports a missing chapter', () => {
    expect(readiness.check(draftCourse(), [])).toEqual(
      expect.arrayContaining(['CHAPTER_REQUIRED', 'PUBLISHED_PROBLEM_REQUIRED']),
    );
  });

  it.each([
    ['DRAFT problem', state({ publishStatus: 'DRAFT' })],
    ['ON_HOLD problem', state({ publishStatus: 'ON_HOLD' })],
    ['deleted problem', state({ isDeleted: true })],
  ])('is not ready when the only problem is a %s', (_name, problemState) => {
    expect(readiness.check(courseWithProblem(), [problemState])).toEqual([
      'PUBLISHED_PROBLEM_REQUIRED',
    ]);
  });

  it('is not ready when the problem state is unknown', () => {
    expect(readiness.check(courseWithProblem(), [])).toEqual(['PUBLISHED_PROBLEM_REQUIRED']);
  });
});

describe('ProblemAttachPolicy', () => {
  const policy = new ProblemAttachPolicy();

  it('allows any published, non-deleted problem', () => {
    expect(policy.isAttachable(state(), OTHER_ID, OWNER_ID)).toBe(true);
  });

  it.each(['DRAFT', 'ON_HOLD'] as const)('allows own %s problem only', (publishStatus) => {
    expect(policy.isAttachable(state({ publishStatus }), OWNER_ID, OWNER_ID)).toBe(true);
    expect(policy.isAttachable(state({ publishStatus }), OTHER_ID, OWNER_ID)).toBe(false);
  });

  it('rejects deleted or unknown problems the same way', () => {
    expect(policy.isAttachable(state({ isDeleted: true }), OWNER_ID, OWNER_ID)).toBe(false);
    expect(policy.isAttachable(undefined, OWNER_ID, OWNER_ID)).toBe(false);
    expect(() => policy.assertAttachable(undefined, OWNER_ID, OWNER_ID)).toThrow(
      DomainValidationError,
    );
  });
});
