import { matchesFilter } from './submission-history';
import { SubmissionKind } from './submission-record';

const record = { kind: SubmissionKind.Submit, problemId: '6832170d-de82-41f7-a82c-57b71efbf55c' };

describe('matchesFilter', () => {
  it('matches every record when the filter is empty', () => {
    expect(matchesFilter(record, {})).toBe(true);
    expect(matchesFilter({ kind: SubmissionKind.Run, problemId: null }, {})).toBe(true);
  });

  it('matches only records that satisfy every given condition', () => {
    expect(
      matchesFilter(record, { kind: SubmissionKind.Submit, problemId: record.problemId }),
    ).toBe(true);
    expect(matchesFilter(record, { kind: SubmissionKind.Run })).toBe(false);
    expect(matchesFilter(record, { problemId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f' })).toBe(
      false,
    );
  });

  it('never matches a Run without a problem when filtering by problem', () => {
    expect(
      matchesFilter({ kind: SubmissionKind.Run, problemId: null }, { problemId: record.problemId }),
    ).toBe(false);
  });
});
