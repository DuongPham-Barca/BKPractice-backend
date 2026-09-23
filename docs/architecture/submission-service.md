# Submission Service Architecture

## Selected style

Submission uses **Clean Architecture + Event-Driven Architecture**, as decided in
[ADR 0002](../adr/0002-revised-service-internal-architectures.md). This selection is unchanged from
ADR 0001. It owns the durable business lifecycle of Run and Submit, but never compiles or executes
student code.

The two halves of the label answer different questions. Event-Driven describes how Submission
communicates: judging takes seconds, so the work is handed over asynchronously and results arrive
back over RabbitMQ. Clean Architecture describes where Submission's own rules live — status
transitions, stable accepted-event identity and the definition of an officially accepted submission
belong in the domain and its use cases, not inside a message consumer.

```text
REST controller
      |
      v
application use case
      |
      v
submission domain
      |
      +--> repository port ------> TypeORM adapter
      +--> judge-job port --------> RabbitMQ publisher
      +--> learning port ---------> internal REST adapter

RabbitMQ result consumer -> result use case
                              +--> repository
                              +--> realtime port -> Redis
                              `--> accepted-event port -> RabbitMQ
```

Recommended growth areas are `modules/submissions`, `modules/run-code` and `modules/realtime`, with
technical adapters under their feature or a shallow service-level `infrastructure` directory. Run
and Submit may share the Submission aggregate/lifecycle while remaining separate use cases.

## Domain and event rules

- Submission status transitions and official scoring/progress eligibility are domain decisions.
- Judge payloads are transport contracts, not Submission entities.
- Judge communication is asynchronous and manually acknowledged.
- Result handling must be idempotent under RabbitMQ redelivery.
- `submission.accepted` is emitted only for an official accepted submission.
- Realtime Redis publication is ephemeral; PostgreSQL remains the source of truth.

## Current implementation and status

Submission owns its database, keeps Run/Submit distinct, obtains hidden judge data through internal
REST, publishes jobs/results through RabbitMQ, and sends realtime data through Redis to the Gateway.
The accepted-event ID/publication marker supports safe redelivery.

Status: **PARTIALLY ALIGNED**. The event-driven flow is aligned, but `SubmissionsService` and
`JudgeResultConsumer` directly coordinate TypeORM, RabbitMQ, HTTP and Redis implementations instead
of application ports. TypeORM entities currently carry the lifecycle state without a separate
framework-independent aggregate.

## Incremental alignment

- Extract Submit, Run, ListHistory and ApplyJudgeResult use cases when expanding those flows.
- Define focused repository, judge-job, learning-client, realtime and accepted-event ports.
- Keep message consumers thin: deserialize, invoke one use case, ACK/NACK at the adapter boundary.
- Do not move compiler, runner or sandbox code into this service.
