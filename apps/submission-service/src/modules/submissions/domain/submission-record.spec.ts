import {
  InvalidSubmissionTransitionError,
  SubmissionKind,
  SubmissionStatus,
  canProduceWrongAnswer,
  createRunRecord,
  isTerminal,
  markRunFailedToDispatch,
  markRunQueued,
} from './submission-record';

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

describe('Run transitions', () => {
  it('moves a pending Run to queued without mutating the original record', () => {
    const createdAt = new Date('2026-10-20T08:00:00.000Z');
    const queuedAt = new Date('2026-10-20T08:00:01.000Z');
    const pending = createRunRecord({
      userId: '5f610e56-5c4f-4e76-ab9b-334ca67a9238',
      language: 'python',
      sourceCode: 'print(1)',
      stdin: '',
      now: createdAt,
    });

    const queued = markRunQueued(pending, queuedAt);

    expect(queued).not.toBe(pending);
    expect(queued.status).toBe(SubmissionStatus.Queued);
    expect(queued.updatedAt).toEqual(queuedAt);
    expect(pending.status).toBe(SubmissionStatus.Pending);
    expect(pending.updatedAt).toEqual(createdAt);
  });

  it('moves a pending Run to internal error when dispatch fails', () => {
    const failedAt = new Date('2026-10-20T08:00:01.000Z');
    const pending = createRunRecord({
      userId: '5f610e56-5c4f-4e76-ab9b-334ca67a9238',
      language: 'java',
      sourceCode: 'class Main {}',
      stdin: '',
      now: new Date('2026-10-20T08:00:00.000Z'),
    });

    const failed = markRunFailedToDispatch(pending, failedAt);

    expect(failed).not.toBe(pending);
    expect(failed.status).toBe(SubmissionStatus.InternalError);
    expect(failed.updatedAt).toEqual(failedAt);
    expect(pending.status).toBe(SubmissionStatus.Pending);
  });

  it.each([
    ['a Submit record', { kind: SubmissionKind.Submit }],
    ['a queued Run', { status: SubmissionStatus.Queued }],
    ['a terminal Run', { status: SubmissionStatus.InternalError }],
  ])('rejects queueing %s', (_case, override) => {
    const pending = createRunRecord({
      userId: '5f610e56-5c4f-4e76-ab9b-334ca67a9238',
      language: 'c',
      sourceCode: 'int main(void) { return 0; }',
      stdin: '',
      now: new Date('2026-10-20T08:00:00.000Z'),
    });

    expect(() =>
      markRunQueued({ ...pending, ...override }, new Date('2026-10-20T08:00:01.000Z')),
    ).toThrow(InvalidSubmissionTransitionError);
  });

  it.each([
    ['a Submit record', { kind: SubmissionKind.Submit }],
    ['a queued Run', { status: SubmissionStatus.Queued }],
    ['a terminal Run', { status: SubmissionStatus.Executed }],
  ])('rejects dispatch failure for %s', (_case, override) => {
    const pending = createRunRecord({
      userId: '5f610e56-5c4f-4e76-ab9b-334ca67a9238',
      language: 'cpp',
      sourceCode: 'int main() { return 0; }',
      stdin: '',
      now: new Date('2026-10-20T08:00:00.000Z'),
    });

    expect(() =>
      markRunFailedToDispatch({ ...pending, ...override }, new Date('2026-10-20T08:00:01.000Z')),
    ).toThrow(InvalidSubmissionTransitionError);
  });

  it('exposes a stable domain error code for invalid transitions', () => {
    expect.assertions(2);
    const pending = createRunRecord({
      userId: '5f610e56-5c4f-4e76-ab9b-334ca67a9238',
      language: 'python',
      sourceCode: 'print(1)',
      stdin: '',
      now: new Date('2026-10-20T08:00:00.000Z'),
    });

    try {
      markRunQueued(
        { ...pending, status: SubmissionStatus.Executed },
        new Date('2026-10-20T08:00:01.000Z'),
      );
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
