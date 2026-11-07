import type { TransactionRunner } from '@learning/modules/problems/application/ports/out/transaction-runner.port.out';
import type { ProblemProgress } from '@learning/modules/progress/domain/problem-progress';
import type { ProgressRepository } from '@learning/modules/progress/domain/repositories/progress-repository.port.out';

import { ApplyAcceptedSubmissionUseCase } from './apply-accepted-submission.use-case';

const EVENT = {
  eventId: '11111111-1111-4111-8111-111111111111',
  submissionId: '22222222-2222-4222-8222-222222222222',
  userId: '33333333-3333-4333-8333-333333333333',
  problemId: '44444444-4444-4444-8444-444444444444',
  occurredAt: '2026-01-02T00:00:00.000Z',
  score: 80,
};

describe('ApplyAcceptedSubmissionUseCase', () => {
  it('applies a new event, then ignores it even after another event has been applied', async () => {
    const receipts = new Set<string>();
    const state: { saved: ProblemProgress | null } = { saved: null };
    const repository: ProgressRepository = {
      recordReceipt: jest.fn(async (event) => {
        if (receipts.has(event.eventId)) return false;
        receipts.add(event.eventId);
        return true;
      }),
      insertIfAbsent: jest.fn(async (progress) => {
        if (state.saved) return false;
        state.saved = progress;
        return true;
      }),
      loadForUpdate: jest.fn(async () => state.saved),
      save: jest.fn(async (progress) => {
        state.saved = progress;
      }),
    };
    const transactionRunner: TransactionRunner = { run: async (work) => work() };
    const useCase = new ApplyAcceptedSubmissionUseCase(repository, transactionRunner);
    const later = {
      ...EVENT,
      eventId: '55555555-5555-4555-8555-555555555555',
      occurredAt: '2026-01-03T00:00:00.000Z',
      score: 100,
    };

    expect(await useCase.execute(EVENT)).toBe('APPLIED');
    expect(await useCase.execute(later)).toBe('APPLIED');
    expect(await useCase.execute(EVENT)).toBe('DUPLICATE');
    expect(state.saved?.bestScore).toBe(100);
    expect(state.saved?.solvedAt).toEqual(new Date(EVENT.occurredAt));
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('replaces an old ATTEMPTED row with a solved row', async () => {
    const repository: ProgressRepository = {
      recordReceipt: jest.fn().mockResolvedValue(true),
      insertIfAbsent: jest.fn().mockResolvedValue(false),
      loadForUpdate: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new ApplyAcceptedSubmissionUseCase(repository, { run: async (work) => work() });

    expect(await useCase.execute(EVENT)).toBe('APPLIED');
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ bestScore: 80, solvedAt: new Date(EVENT.occurredAt) }),
    );
  });

  it('rejects malformed events before starting a transaction', async () => {
    const run = jest.fn();
    const useCase = new ApplyAcceptedSubmissionUseCase({} as ProgressRepository, { run });

    await expect(useCase.execute({ ...EVENT, score: -1 })).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
  });
});
