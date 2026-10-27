import {
  InvalidSubmissionTransitionError,
  SubmissionKind,
  SubmissionStatus,
  applyVerdict,
  canProduceWrongAnswer,
  createRunRecord,
  createSubmitRecord,
  isOfficiallyAccepted,
  isTerminal,
  toJudgeVerdictStatus,
} from './submission-record';
import type { SubmissionRecord, SubmitVerdict } from './submission-record';

const queuedSubmit: SubmissionRecord = {
  id: '0f6c3f7e-58a4-4a64-8f40-0a8d3f1f6a10',
  publicId: '6e1d2c0b-2c43-4e0f-9b88-2f7f4f5c0c11',
  userId: '5f610e56-5c4f-4e76-ab9b-334ca67a9238',
  problemId: '6832170d-de82-41f7-a82c-57b71efbf55c',
  kind: SubmissionKind.Submit,
  language: 'python',
  sourceCode: 'print(1)',
  stdin: '',
  status: SubmissionStatus.Queued,
  createdAt: new Date('2026-10-20T08:00:00.000Z'),
  updatedAt: new Date('2026-10-20T08:00:00.000Z'),
};

function verdict(overrides: Partial<SubmitVerdict> = {}): SubmitVerdict {
  return {
    status: SubmissionStatus.Accepted,
    score: null,
    passedTests: 2,
    totalTests: 2,
    runtimeMs: 10,
    memoryKb: 512,
    ...overrides,
  };
}

describe('createRunRecord', () => {
  it('creates a pending Run record from user input', () => {
    const now = new Date('2026-10-20T08:00:00.000Z');

    const record = createRunRecord({
      userId: '5f610e56-5c4f-4e76-ab9b-334ca67a9238',
      problemId: '6832170d-de82-41f7-a82c-57b71efbf55c',
      language: 'python',
      sourceCode: 'print(input())',
      stdin: 'hello',
      now,
    });

    expect(record).toEqual({
      id: null,
      publicId: null,
      userId: '5f610e56-5c4f-4e76-ab9b-334ca67a9238',
      problemId: '6832170d-de82-41f7-a82c-57b71efbf55c',
      kind: SubmissionKind.Run,
      language: 'python',
      sourceCode: 'print(input())',
      stdin: 'hello',
      status: SubmissionStatus.Pending,
      createdAt: now,
      updatedAt: now,
    });
  });

  it('normalizes an omitted problem ID to null', () => {
    const now = new Date('2026-10-20T08:00:00.000Z');

    const record = createRunRecord({
      userId: '5f610e56-5c4f-4e76-ab9b-334ca67a9238',
      language: 'cpp',
      sourceCode: 'int main() {}',
      stdin: '',
      now,
    });

    expect(record.problemId).toBeNull();
    expect(record.publicId).toBeNull();
  });
});

describe('invalid transitions', () => {
  it('exposes a stable domain error code', () => {
    expect.assertions(2);

    try {
      applyVerdict({ ...queuedSubmit, status: SubmissionStatus.Executed }, verdict(), new Date());
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(InvalidSubmissionTransitionError);
      expect(error).toMatchObject({ code: 'INVALID_SUBMISSION_TRANSITION' });
    }
  });
});

describe('submission status rules', () => {
  it.each([
    [SubmissionStatus.Pending, false],
    [SubmissionStatus.Queued, false],
    [SubmissionStatus.Running, false],
    [SubmissionStatus.Executed, true],
    [SubmissionStatus.Accepted, true],
    [SubmissionStatus.WrongAnswer, true],
    [SubmissionStatus.CompileError, true],
    [SubmissionStatus.RuntimeError, true],
    [SubmissionStatus.TimeLimitExceeded, true],
    [SubmissionStatus.MemoryLimitExceeded, true],
    [SubmissionStatus.InternalError, true],
  ])('reports whether %s is terminal', (status, expected) => {
    expect(isTerminal(status)).toBe(expected);
  });

  it('prevents Run from producing wrong answer', () => {
    expect(canProduceWrongAnswer(SubmissionKind.Run)).toBe(false);
  });

  it('allows Submit to produce wrong answer', () => {
    expect(canProduceWrongAnswer(SubmissionKind.Submit)).toBe(true);
  });
});

describe('createSubmitRecord', () => {
  it('creates a pending Submit with no stdin from user input', () => {
    const now = new Date('2026-10-27T06:00:00.000Z');

    const record = createSubmitRecord({
      userId: queuedSubmit.userId,
      problemId: '6832170d-de82-41f7-a82c-57b71efbf55c',
      language: 'cpp',
      sourceCode: 'int main() {}',
      now,
    });

    expect(record).toMatchObject({
      id: null,
      publicId: null,
      kind: SubmissionKind.Submit,
      status: SubmissionStatus.Pending,
      problemId: '6832170d-de82-41f7-a82c-57b71efbf55c',
      stdin: '',
      createdAt: now,
    });
  });
});

describe('Submit verdict rules', () => {
  it('maps every Judge status to a Submit verdict without a cast', () => {
    expect(toJudgeVerdictStatus('ACCEPTED')).toBe(SubmissionStatus.Accepted);
    expect(toJudgeVerdictStatus('WRONG_ANSWER')).toBe(SubmissionStatus.WrongAnswer);
    expect(toJudgeVerdictStatus('INTERNAL_ERROR')).toBe(SubmissionStatus.InternalError);
  });

  it.each(['EXECUTED', 'QUEUED', 'accepted', ''])('rejects %p as a Submit verdict', (status) => {
    expect(toJudgeVerdictStatus(status)).toBeNull();
  });

  it('applies a verdict to an open Submit without mutating it', () => {
    const at = new Date('2026-10-20T08:00:05.000Z');

    const decided = applyVerdict(queuedSubmit, verdict(), at);

    expect(decided.status).toBe(SubmissionStatus.Accepted);
    expect(decided.updatedAt).toEqual(at);
    expect(queuedSubmit.status).toBe(SubmissionStatus.Queued);
  });

  it.each([
    ['a terminal Submit', { status: SubmissionStatus.WrongAnswer }],
    ['a Run', { kind: SubmissionKind.Run }],
  ])('refuses to overwrite %s', (_case, override) => {
    expect(() => applyVerdict({ ...queuedSubmit, ...override }, verdict(), new Date())).toThrow(
      InvalidSubmissionTransitionError,
    );
  });

  it('treats only an ACCEPTED Submit with a problem as officially accepted', () => {
    const accepted = { ...queuedSubmit, status: SubmissionStatus.Accepted };

    expect(isOfficiallyAccepted(accepted)).toBe(true);
    expect(isOfficiallyAccepted({ ...accepted, kind: SubmissionKind.Run })).toBe(false);
    expect(isOfficiallyAccepted({ ...accepted, problemId: null })).toBe(false);
    expect(isOfficiallyAccepted({ ...accepted, status: SubmissionStatus.InternalError })).toBe(
      false,
    );
    expect(isOfficiallyAccepted({ ...accepted, status: SubmissionStatus.Executed })).toBe(false);
  });
});
