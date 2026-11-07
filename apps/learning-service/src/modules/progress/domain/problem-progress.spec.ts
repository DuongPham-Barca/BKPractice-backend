import { AcceptedSubmission, InvalidAcceptedSubmission } from './accepted-submission';
import { ProblemProgress } from './problem-progress';

const EVENT = {
  eventId: '11111111-1111-4111-8111-111111111111',
  submissionId: '22222222-2222-4222-8222-222222222222',
  userId: '33333333-3333-4333-8333-333333333333',
  problemId: '44444444-4444-4444-8444-444444444444',
  occurredAt: '2026-01-02T00:00:00.000Z',
  score: 80,
};

describe('AcceptedSubmission and ProblemProgress', () => {
  it.each([
    null,
    {},
    { ...EVENT, eventId: 'invalid' },
    { ...EVENT, submissionId: 'invalid' },
    { ...EVENT, userId: 'invalid' },
    { ...EVENT, problemId: 'invalid' },
    { ...EVENT, occurredAt: 'not-a-date' },
    { ...EVENT, occurredAt: '2026-02-30T00:00:00.000Z' },
    { ...EVENT, score: -1 },
    { ...EVENT, score: 0.5 },
  ])('rejects malformed accepted events', (value) => {
    expect(() => AcceptedSubmission.parse(value)).toThrow(InvalidAcceptedSubmission);
  });

  it('uses the earliest solve time and highest score regardless of event order', () => {
    const events = [
      AcceptedSubmission.parse(EVENT),
      AcceptedSubmission.parse({
        ...EVENT,
        eventId: '55555555-5555-4555-8555-555555555555',
        occurredAt: '2026-01-01T00:00:00.000Z',
        score: 40,
      }),
      AcceptedSubmission.parse({
        ...EVENT,
        eventId: '66666666-6666-4666-8666-666666666666',
        occurredAt: '2026-01-03T00:00:00.000Z',
        score: 100,
      }),
    ];

    for (const order of [events, [...events].reverse()]) {
      const first = order[0]!;
      const progress = order
        .slice(1)
        .reduce((state, event) => state.applyAccepted(event), ProblemProgress.firstSolve(first));
      expect(progress.bestScore).toBe(100);
      expect(progress.solvedAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    }
  });
});
