import { normalizeJudgeOutput } from './output-normalizer';

describe('normalizeJudgeOutput', () => {
  it('normalizes line endings and trailing whitespace only', () => {
    expect(normalizeJudgeOutput('a  \r\n b\r\n\r\n')).toBe('a  \n b');
  });
});
