export const ACCEPTED_EVENT_PORT = Symbol('AcceptedEventPort');

export interface AcceptedProgressEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly submissionId: string;
  readonly userId: string;
  readonly problemId: string;
  readonly score: number;
}

export interface AcceptedEventPort {
  publish(event: AcceptedProgressEvent): Promise<void>;
}
