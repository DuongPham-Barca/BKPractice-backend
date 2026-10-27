import { parseJudgeResult } from './judge-result.parser';

describe('parseJudgeResult', () => {
  it('accepts a valid Judge result', () => {
    expect(
      parseJudgeResult({
        executionId: 'execution',
        submissionId: 'submission',
        mode: 'RUN',
        status: 'ACCEPTED',
        stdout: 'ok',
      }),
    ).toMatchObject({ mode: 'RUN', status: 'ACCEPTED' });
  });

  it.each([
    [null],
    [{ submissionId: 'submission', mode: 'RUN', status: 'ACCEPTED' }],
    [{ executionId: 'x', submissionId: 'y', mode: 'RUN', status: 'UNKNOWN' }],
    [{ executionId: 'x', submissionId: 'y', mode: 'RUN', status: 'ACCEPTED', runtimeMs: -1 }],
  ])('rejects a malformed Judge result', (payload) => {
    expect(parseJudgeResult(payload)).toBeNull();
  });
});
