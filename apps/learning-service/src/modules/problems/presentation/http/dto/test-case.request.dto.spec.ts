import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  AddTestCaseRequestDto,
  HarnessLanguageParamDto,
  ReorderTestCasesRequestDto,
  SetHarnessRequestDto,
  UpdateTestCaseRequestDto,
} from './test-case.request.dto';

const CASE_ID = '00000000-0000-4000-8000-000000000011';
const OTHER_CASE_ID = '00000000-0000-4000-8000-000000000012';

describe('AddTestCaseRequestDto', () => {
  it('accepts visibility as optional and validates the other fields', async () => {
    await expect(
      errorsOf(AddTestCaseRequestDto, { expectedOutput: '', score: 0 }),
    ).resolves.toEqual([]);
    await expect(errorsOf(AddTestCaseRequestDto, {})).resolves.toEqual(
      expect.arrayContaining(['expectedOutput', 'score']),
    );
    await expect(
      errorsOf(AddTestCaseRequestDto, {
        expectedOutput: '3',
        score: -1,
        visibility: 'PUBLIC',
      }),
    ).resolves.toEqual(expect.arrayContaining(['score', 'visibility']));
  });
});

describe('UpdateTestCaseRequestDto', () => {
  it('accepts an empty patch and rejects invalid provided values', async () => {
    await expect(errorsOf(UpdateTestCaseRequestDto, {})).resolves.toEqual([]);
    await expect(errorsOf(UpdateTestCaseRequestDto, { displayOrder: 2 })).resolves.toEqual([]);
    await expect(
      errorsOf(UpdateTestCaseRequestDto, { expectedOutput: null, score: -1, displayOrder: -1 }),
    ).resolves.toEqual(expect.arrayContaining(['expectedOutput', 'score', 'displayOrder']));
  });
});

describe('ReorderTestCasesRequestDto', () => {
  it('requires unique UUIDs and a non-empty list', async () => {
    await expect(
      errorsOf(ReorderTestCasesRequestDto, { testCaseIds: [CASE_ID, OTHER_CASE_ID] }),
    ).resolves.toEqual([]);
    await expect(errorsOf(ReorderTestCasesRequestDto, { testCaseIds: [] })).resolves.toContain(
      'testCaseIds',
    );
    await expect(
      errorsOf(ReorderTestCasesRequestDto, { testCaseIds: [CASE_ID, CASE_ID] }),
    ).resolves.toContain('testCaseIds');
    await expect(
      errorsOf(ReorderTestCasesRequestDto, { testCaseIds: ['not-a-uuid'] }),
    ).resolves.toContain('testCaseIds');
  });
});

describe('SetHarnessRequestDto and HarnessLanguageParamDto', () => {
  it('requires a non-empty source and a supported language', async () => {
    await expect(errorsOf(SetHarnessRequestDto, { source: 'harness' })).resolves.toEqual([]);
    await expect(errorsOf(SetHarnessRequestDto, { source: '' })).resolves.toContain('source');
    await expect(
      errorsOf(HarnessLanguageParamDto, { id: CASE_ID, language: 'python' }),
    ).resolves.toEqual([]);
    await expect(
      errorsOf(HarnessLanguageParamDto, { id: CASE_ID, language: 'cobol' }),
    ).resolves.toContain('language');
    await expect(errorsOf(HarnessLanguageParamDto, { language: 'python' })).resolves.toContain(
      'id',
    );
  });
});

async function errorsOf(
  type: new () => object,
  payload: Record<string, unknown>,
): Promise<string[]> {
  const errors = await validate(plainToInstance(type, payload));

  return errors.map((error) => error.property);
}
