import { SubmissionKind, SubmissionStatus } from '../../submissions/domain/submission-record';
import type { RunCodeUseCase } from '../application/run-code.use-case';

import { RunCodeController } from './run-code.controller';

const OWNER_ID = '11111111-2222-4333-8444-555555555555';

describe('RunCodeController', () => {
  it('returns the exact public acceptance response and no database ID', async () => {
    const acceptance = {
      id: '0ca5f6c9-d86f-439a-992e-c6671786bb96',
      kind: SubmissionKind.Run,
      status: SubmissionStatus.Queued,
      language: 'python',
      createdAt: new Date('2026-10-21T06:00:00.000Z'),
    };
    const runCode = { execute: jest.fn().mockResolvedValue(acceptance) };
    const controller = new RunCodeController(runCode as unknown as RunCodeUseCase);

    const result = await controller.run(OWNER_ID, {
      language: 'python',
      sourceCode: 'print(1)',
      stdin: '',
    });

    expect(result).toEqual({ ...acceptance, createdAt: '2026-10-21T06:00:00.000Z' });
    expect(Object.keys(result).sort()).toEqual(
      ['id', 'kind', 'status', 'language', 'createdAt'].sort(),
    );
  });
});
