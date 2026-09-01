export const RABBIT_EXCHANGES = {
  judge: 'bkpractice.judge',
  submission: 'bkpractice.submission',
  learning: 'bkpractice.learning',
  deadLetter: 'bkpractice.dead-letter',
} as const;

export const RABBIT_QUEUES = {
  judgeRequests: 'judge.requests',
  submissionResults: 'submission.results',
  learningAccepted: 'learning.submission.accepted',
  judgeRequestsDead: 'judge.requests.dead',
  submissionResultsDead: 'submission.results.dead',
  learningAcceptedDead: 'learning.submission.accepted.dead',
} as const;

export const RABBIT_ROUTING_KEYS = {
  judgeRequest: 'judge.request',
  judgeResult: 'judge.result',
  submissionAccepted: 'submission.accepted',
  judgeRequestDead: 'judge.request.dead',
  judgeResultDead: 'judge.result.dead',
  submissionAcceptedDead: 'submission.accepted.dead',
} as const;

export const REDIS_CHANNELS = {
  submissionResults: 'bkpractice:submission-results',
} as const;
