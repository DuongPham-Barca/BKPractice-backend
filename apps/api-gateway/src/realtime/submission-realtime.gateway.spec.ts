import { parseSubmissionRealtimeEnvelope } from './submission-realtime.gateway';

describe('parseSubmissionRealtimeEnvelope', () => {
  it('rebuilds a whitelist notification and drops unknown fields', () => {
    expect(
      parseSubmissionRealtimeEnvelope(
        JSON.stringify({
          userId: 'a06b8e8e-df47-4d98-a210-66cc819ee9e6',
          notification: {
            submissionId: 'e965be3a-3ce7-4591-80aa-dfc9b098dd7c',
            kind: 'RUN',
            status: 'EXECUTED',
            ready: true,
            stdout: 'must not cross gateway',
          },
          result: { stderr: 'legacy payload' },
        }),
      ),
    ).toEqual({
      userId: 'a06b8e8e-df47-4d98-a210-66cc819ee9e6',
      notification: {
        submissionId: 'e965be3a-3ce7-4591-80aa-dfc9b098dd7c',
        kind: 'RUN',
        status: 'EXECUTED',
        ready: true,
      },
    });
  });

  it.each([
    ['not json'],
    [JSON.stringify({ userId: 'not-a-uuid', notification: {} })],
    [
      JSON.stringify({
        userId: 'a06b8e8e-df47-4d98-a210-66cc819ee9e6',
        notification: {
          submissionId: 'e965be3a-3ce7-4591-80aa-dfc9b098dd7c',
          kind: 'RUN',
          status: 'UNKNOWN',
          ready: true,
        },
      }),
    ],
    [
      JSON.stringify({
        userId: 'a06b8e8e-df47-4d98-a210-66cc819ee9e6',
        notification: {
          submissionId: 'e965be3a-3ce7-4591-80aa-dfc9b098dd7c',
          kind: 'RUN',
          status: 'QUEUED',
          ready: true,
        },
      }),
    ],
    [
      JSON.stringify({
        userId: 'a06b8e8e-df47-4d98-a210-66cc819ee9e6',
        notification: {
          submissionId: 'e965be3a-3ce7-4591-80aa-dfc9b098dd7c',
          kind: 'RUN',
          status: 'EXECUTED',
          ready: false,
        },
      }),
    ],
  ])('rejects malformed realtime input', (message) => {
    expect(parseSubmissionRealtimeEnvelope(message)).toBeNull();
  });
});
