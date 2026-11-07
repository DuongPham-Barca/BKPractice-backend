const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export class InvalidAcceptedSubmission extends Error {
  constructor() {
    super('Invalid submission.accepted event');
  }
}

export class AcceptedSubmission {
  private constructor(
    readonly eventId: string,
    readonly submissionId: string,
    readonly userId: string,
    readonly problemId: string,
    readonly occurredAt: Date,
    readonly score: number,
  ) {}

  static parse(input: unknown): AcceptedSubmission {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new InvalidAcceptedSubmission();
    }
    const event = input as Record<string, unknown>;
    if (
      !isUuid(event.eventId) ||
      !isUuid(event.submissionId) ||
      !isUuid(event.userId) ||
      !isUuid(event.problemId) ||
      typeof event.occurredAt !== 'string' ||
      !ISO_DATE_TIME.test(event.occurredAt) ||
      !hasValidCalendarDate(event.occurredAt) ||
      !Number.isSafeInteger(event.score) ||
      (event.score as number) < 0
    ) {
      throw new InvalidAcceptedSubmission();
    }
    const occurredAt = new Date(event.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) throw new InvalidAcceptedSubmission();
    return new AcceptedSubmission(
      event.eventId,
      event.submissionId,
      event.userId,
      event.problemId,
      occurredAt,
      event.score as number,
    );
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

function hasValidCalendarDate(value: string): boolean {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const calendar = new Date(Date.UTC(year, month - 1, day));
  return (
    calendar.getUTCFullYear() === year &&
    calendar.getUTCMonth() + 1 === month &&
    calendar.getUTCDate() === day
  );
}
