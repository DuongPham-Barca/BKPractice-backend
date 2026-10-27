# 2026-10-27 — Submit judge-result use case, accepted-event outbox and thin consumer

- Author: Claude (on `feature/submission-service`, on top of the uncommitted SUB-001 work)
- Scope: the SUB-002 "apply judge result" half: domain verdict rules, nullable score, outbox and
  relay for `submission.accepted`, and a transport-only `JudgeResultConsumer`. Submit creation
  (`SubmitCodeUseCase`, Learning port) and the Submit watchdog are not part of this work.

## Spec and plan

- Spec: `specs/03-submission/submit-code/spec.md` (SUB-002 v1.0)
- Plan: `specs/03-submission/submit-code/plan.md` — implementation order steps 2, 3, 6, 7 (relay part), 8
- Tasks: `specs/03-submission/submit-code/tasks.md`
- Spec status at start: Approved

## Questions clarified

| Question                                                                                            | Conclusion                                                                                                                                                     | Source                                                             |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Should the accepted-event port publish straight to RabbitMQ, keeping `progress_event_published_at`? | No. Write an outbox row in the verdict transaction and let a relay publish it. Direct publish breaks SUB-002-FR-016.                                           | SUB-002-FR-016; plan, "Lưu trữ"; user chose "Theo plan, có outbox" |
| Is `SubmitCodeUseCase` / `LearningJudgePackagePort` in scope?                                       | No, it comes in the next slice. `SubmissionsService.submit()` stays as it is.                                                                                  | User decision                                                      |
| How often does the relay run?                                                                       | Every 5 s, up to 20 events per run. Both are code constants, like `RUN_WATCHDOG_INTERVAL_MS`, with no new env var.                                             | User decision (the plan does not set an interval)                  |
| What happens to a malformed result or one for an unknown submission?                                | The handler throws, so the delivery is NACKed. `RabbitMqService` retries it 3 times, then dead-letters it.                                                     | Plan, "Về: `judge.result`" and "Xử lý lỗi"                         |
| Does a Run result for an unknown record change?                                                     | No. Run keeps its existing warn + ACK behaviour. Only parse failures, which come before the mode is known, now NACK for both modes.                            | SUB-001 behaviour is outside this scope                            |
| Where do the new use cases live?                                                                    | In `modules/submissions/application/`, next to the existing Run use cases. The plan's module-root path predates that folder.                                   | Existing code layout                                               |
| What happens to accepted events the old consumer never published?                                   | The outbox migration backfills Submit `ACCEPTED` rows that have `accepted_event_id` set and `progress_event_published_at` NULL, using their existing event ID. | SUB-002-FR-015 (no lost event)                                     |

## What was done

**Domain** (`domain/submission-record.ts`): added `SubmitVerdict` and `DecidingScore` (`number | null`).
`toJudgeVerdictStatus` checks a Judge status string against the seven Submit verdicts without
casting. `applyVerdict` refuses any record that is not Submit or is already terminal.
`isOfficiallyAccepted` encodes FR-013: Submit, `ACCEPTED`, and a `problemId` present.
`ACCEPTED_PROGRESS_SCORE = 100` encodes the LRN-006 rule.

**Ports**: new `domain/ports/accepted-event.port.ts` (`AcceptedEventPort`, `AcceptedProgressEvent`).
`SubmissionRepositoryPort` gains two methods:

- `applySubmitVerdictOnce`: writes the verdict, the result row and an optional outbox row atomically.
- `relayOldestPendingAcceptedEvent`: publishes and marks one outbox row.

**Application**:

- `ApplySubmitJudgeResultUseCase` decides the verdict and whether an accepted event is due, persists
  through the port, and then sends the minimal realtime notification.
- `RelayAcceptedEventsUseCase` drains up to 20 pending events per run.

**Infrastructure**:

- `TypeormSubmissionRepository` implements the two new methods.
- `RabbitAcceptedEventAdapter` publishes to `bkpractice.learning` / `submission.accepted` with
  `messageId = eventId`.
- `AcceptedEventRelay` runs the relay use case on a timer, built the same way as `RunWatchdog`.
- New entity `SubmissionAcceptedOutbox`. `Submission.score` is now nullable.

**Presentation**: `JudgeResultConsumer` now only parses the payload, picks the Run or Submit use case by
`mode`, and logs ignored outcomes. It no longer touches `DataSource`, the TypeORM repository,
`RabbitMqService.publish` or the realtime port.

**Migrations**:

- `1792515604000-MakeSubmissionScoreNullable` drops `NOT NULL` and the default from `score`.
- `1792515605000-CreateSubmissionAcceptedOutbox` creates the outbox table and its pending index, then
  backfills the outbox.

What changes for callers:

- A Submit result with no Judge score is stored as `null`, not `0`.
- An accepted Submit can no longer lose its progress event if the process crashes between commit and
  publish.
- A garbage result is dead-lettered instead of being silently acknowledged.

## Why these choices

- **Conditional `UPDATE … WHERE status IN (PENDING, QUEUED, RUNNING) RETURNING *` instead of a row
  lock.** This is the "update in a single statement" the plan asks for (plan, "Lỗi thật" table, last
  row). Whichever delivery updates the row wins. Every other delivery affects zero rows and writes no
  result or outbox row. That covers FR-017, FR-018 and AC-008/009 at the database level.
- **Return the updated record instead of an affected-row count.** The use case needs `userId` and
  `publicId` for the realtime notification. Reading them from `RETURNING` saves a second query.
- **Generate the event ID in the use case, but only on the path that goes on to write.** The ID is
  persisted once, in `accepted_event_id` and in the outbox primary key, inside the same transaction.
  A redelivery never reaches the write, so the ID is never regenerated (FR-014). That is why no
  separate `ensureAcceptedEventId` helper exists.
- **Store the outbox payload in the wire format of `SubmissionAcceptedEvent`.** The relay needs no
  join, and the payload holds exactly the six approved fields. It contains no source code or Test
  Case data (FR-015, AC-010, SR-005).
- **Relay one event per transaction, using `FOR UPDATE SKIP LOCKED`.** A broker failure rolls back only
  the event that failed; events already confirmed stay marked. Several service instances can relay in
  parallel. Each row is marked `published_at` only after `waitForConfirms` succeeds.
- **Throw, rather than return, on malformed or unknown results.** `RabbitMqService` turns a thrown
  error into retry followed by dead-letter, which is the NACK path the plan requires.
- **Use a backfill migration.** Without it, an accepted Submit that the old consumer committed but
  never published would never reach Learning.

## How the feature works

1. Judge publishes a `JudgeResult` to `bkpractice.submission` / `judge.result`.
2. `JudgeResultConsumer.handleResult` parses the payload with the zod schema. A parse failure throws:
   the message is retried 3 times and then dead-lettered. A `RUN` result goes to
   `ApplyRunJudgeResultUseCase`, which is unchanged. A `SUBMIT` result goes to
   `ApplySubmitJudgeResultUseCase`.
3. The use case maps the status with `toJudgeVerdictStatus` and loads the record.
   - An unknown record throws (NACK).
   - A Run record returns `kind-mismatch` (warn + ACK).
   - A terminal record returns `already-terminal` (ACK, nothing written).
   - Otherwise it builds the verdict, keeping score `null` when Judge did not send one, and checks the
     transition with `applyVerdict`. If `isOfficiallyAccepted` holds, it builds the accepted event
     with a new `eventId` and `score: 100`.
4. `applySubmitVerdictOnce` opens one transaction. It runs the conditional update and, if one row
   came back, inserts the `submission_results` row and, for an accepted Submit, the
   `submission_accepted_outbox` row. If no row came back, it writes nothing.
5. After the commit, the use case publishes the realtime notification `{ submissionId: publicId,
kind: SUBMIT, status, ready: true }`. A Redis failure is swallowed in the adapter.
6. Every 5 s, `AcceptedEventRelay` runs `RelayAcceptedEventsUseCase`. It repeatedly locks the oldest
   pending outbox row, publishes it through `RabbitAcceptedEventAdapter` with broker confirm, and sets
   `published_at`. It stops when the outbox is empty, after 20 events, or at the first broker error.
   On a broker error the row stays pending and the relay logs a warning with only the submission ID
   and event ID.
7. Learning consumes `submission.accepted` and deduplicates by `eventId` (LRN-006). A crash after the
   broker confirms but before `published_at` is committed makes the relay send the same `eventId`
   again, which Learning ignores.

## Configuration

No configuration change. The relay interval (5 s) and batch size (20) are code constants:
`ACCEPTED_EVENT_RELAY_INTERVAL_MS` and `ACCEPTED_EVENT_RELAY_BATCH_SIZE`.

## Verification

- Commands run and their results:
  - `pnpm test`: 22 suites, 110 tests passed. New suites: the apply-submit use case, the relay use
    case, the consumer, the Rabbit accepted-event adapter, and the Submit-result migrations. Extended
    suites: domain and repository.
  - `pnpm build:submission`: compiled successfully.
  - `pnpm typecheck` and `pnpm lint`: both fail only on `apps/learning-service/src/database/data-source.ts:14`
    (a stray `heheh` line). That line was already in the worktree and is not part of this change.
    The Submission service has no errors.
  - `pnpm migration:run:submission`: the user ran it against the shared database.
    `MakeSubmissionScoreNullable1792515604000` and `CreateSubmissionAcceptedOutbox1792515605000`
    both executed and committed in one transaction. `migration:show` beforehand listed exactly these
    two as pending.
  - After the migration, the user's query on `submission_accepted_outbox` returned `total = 0,
pending = 0`: the shared database had no accepted Submit whose event was left unpublished, so
    the backfill inserted nothing.
- Not verified:
  - The backfill SQL has not run against a non-empty set of rows; it is covered only by the
    migration unit test.
  - AC-009 (two concurrent deliveries) is covered only by unit tests of the zero-row branch, not by a
    real PostgreSQL concurrency test.
  - The relay was not run against a live RabbitMQ.

## Remaining

- Not done:
  - `SubmitCodeUseCase` with `LearningJudgePackagePort` / `HttpLearningJudgePackageAdapter`.
  - Submit support in `RabbitJudgeJobAdapter`.
  - Removing `SubmissionsService`.
  - Extending the 10-minute watchdog to Submit records.
  - Moving the controller and consumer into `presentation/` and the entities into `infrastructure/`.
- Risks:
  - Old `score = 0` rows cannot be told apart from a real Judge score of 0.
  - `progress_event_published_at` is no longer written; it is kept only for history.
  - Until the Submit watchdog exists, a Submit whose result never arrives stays `QUEUED`.
  - A malformed result is now retried 3 times before it is dead-lettered. That retry count is the
    existing `RabbitMqService` convention.
