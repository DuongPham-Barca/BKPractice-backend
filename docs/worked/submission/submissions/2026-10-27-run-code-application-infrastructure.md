# 2026-10-27 — Run Code application, infrastructure, migration and wiring

- Author: Claude (review and fixes on top of the uncommitted SUB-001 work on `feature/submission-service`)
- Scope: SUB-001 application/infrastructure/migration/API, the SUB-004 notification contract used by Run,
  and the SUB-003 detail lookup and `public_id` migration that the Run response depends on

## Spec and plan

- Spec: `specs/03-submission/run-code/spec.md` (also read: `submit-code`, `submission-history`, `realtime-result`)
- Plan: `specs/03-submission/run-code/plan.md`; `submission-history/plan.md` for `public_id`; `realtime-result/plan.md` for the notification
- Tasks: `specs/03-submission/run-code/tasks.md`
- Spec status at start: Approved (all four submission specs)

## Questions clarified

| Question                                             | Conclusion                                                                                                                                                                  | Source                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Where does `RunCodeUseCase` live?                    | `modules/run-code/` with its DTOs, importing only `submissions/domain`. Other use cases stay in `modules/submissions/application/`.                                         | SUB-001 plan "Ranh giới module"; user chose "move to run-code" |
| Is a new Nest module needed?                         | No. `SubmissionsModule` is the composition root and binds every port.                                                                                                       | SUB-001 tasks, Infrastructure                                  |
| Which environment keys does Submission read?         | URL-form `SUBMISSION_DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL` (validated in `libs/config/src/environment.ts`), not the `DB_SUBMISSION_HOST/PORT/...` keys shared in chat. | `libs/config/src/environment.ts`                               |
| Who creates `.env`?                                  | Claude generated a local gitignored `.env` from `.env.example`.                                                                                                             | User decision                                                  |
| May migrations run against the shared team database? | Yes, after lint/typecheck/test/build were green.                                                                                                                            | User decision                                                  |
| Which statuses may realtime publish?                 | Terminal statuses only. The contract list and the domain port type now exclude `PENDING/QUEUED/RUNNING`.                                                                    | SUB-004-FR-012                                                 |
| What does the `public_id` migration `down` do?       | It drops `IDX_submissions_owner_created` and keeps `public_id`, so IDs already returned to clients keep resolving.                                                          | SUB-003 plan, Migration                                        |
| How is a legacy ID looked up?                        | Look up `publicId + owner` first, and use `id + owner` only when that finds nothing.                                                                                        | SUB-003 plan, Repository                                       |
| What does Run do with `WRONG_ANSWER` from Judge?     | Treat it as a contract violation: keep the previous status and log a warning. The watchdog later ends the record as `INTERNAL_ERROR`.                                       | SUB-001-FR-006 and the failure table                           |

## What was done

`POST /api/run` now goes through `RunCodeUseCase` (`modules/run-code/run-code.use-case.ts`). It saves a
`PENDING` Run through `SubmissionRepositoryPort` and publishes a fixed-limit job (3000 ms / 256 MB) through
`JudgeJobPort`. It then moves the record to `QUEUED` with a conditional update, or to `INTERNAL_ERROR` if
the publish fails. The response is `RunCodeResponseDto`, which returns the public ID, `RUN`, `QUEUED`, the
language and `createdAt`, and nothing from the entity.

`JudgeResultConsumer` validates every message with a zod parser. A `RUN` result goes to
`ApplyRunJudgeResultUseCase`, which maps `ACCEPTED` to `EXECUTED`, applies the result once under a row lock,
and then publishes a minimal realtime notification. Submit results stay on the existing consumer path,
which now also row-locks and publishes the same minimal notification. `ExpireStaleRunsUseCase` moves Runs
still waiting after 10 minutes to `INTERNAL_ERROR`; `RunWatchdog` triggers it every 60 s.

`GET /api/submissions/:publicId` returns an explicit `SubmissionDetailDto`. It includes stdout/stderr only
for Run, and it returns the same 404 for a missing record and for someone else's record.

Adapters in `modules/submissions/infrastructure/`: `TypeormSubmissionRepository`, `RabbitJudgeJobAdapter`,
and `RedisRealtimeAdapter`. The Redis adapter swallows errors and logs one payload-free warning.

Fixes made during this review:

- Recreated the deleted `submissions.module.ts`. Without it the service did not compile. It also imports
  `HttpModule`, which `LearningJudgeClient` needs and which the original module was missing, so the service
  could not boot before either.
- Narrowed the realtime contract and the domain port to terminal statuses, with a gateway test that rejects `QUEUED`.
- `isTerminal` is now a domain type guard, and the consumer no longer keeps its own copy.
- Changed the legacy ID lookup order and the `public_id` migration `down` to match the SUB-003 plan.
- Moved `run-code-migrations.spec.ts` out of `migrations/`. The TypeORM CLI glob loaded it as a migration and crashed.
- Gave the nullable `SubmissionDetailDto` fields explicit Swagger types. Without them Swagger crashed at boot.
- Fixed lint in the new files.

## Why these choices

- The use cases are plain classes built by factory providers. This keeps the application layer free of
  NestJS, as `dependency-rules.md` requires, and lets the tests use fakes instead of TypeORM mocks.
- Status transitions are conditional SQL updates (`WHERE status = 'PENDING'`, row lock, `UPDATE … RETURNING`).
  SUB-001-FR-014/015 and the watchdog race require atomic transitions, and in-memory domain checks alone cannot provide that.
- The terminal-only type sits on the domain port, not just on the gateway parser, so the application layer
  cannot express a non-terminal publish (SUB-004-FR-012).
- The migration test moved instead of the CLI glob changing. The glob is shared by every service's data source.

## How the feature works

1. An authenticated client calls `POST /api/run`. The Gateway verifies the JWT and forwards `x-auth-user-id`.
2. `SubmissionsController.run` rejects a missing header with 401. `ValidationPipe` (whitelist +
   forbidNonWhitelisted) rejects unknown fields and invalid language, source or stdin.
3. `RunCodeUseCase` saves a `PENDING` record, publishes `JudgeRequest{mode:'RUN'}` to `bkpractice.judge` /
   `judge.request` with `messageId = executionId`, then sets `QUEUED`.
4. The caller receives `202` with the public ID and `QUEUED`. If the publish fails, the record is
   `INTERNAL_ERROR` and the request errors.
5. Judge replies on `submission.results`. The consumer parses the message and the use case persists the
   status, runtime, memory and output once. Redis then receives `{ userId, notification }`, and the Gateway
   emits only the notification to `user:<id>`.
6. Failure paths: a malformed result or a Run `WRONG_ANSWER` is ignored with a warning; a duplicate or late
   result is a no-op; Redis being down only drops the notification; no result within 10 minutes means the
   watchdog sets `INTERNAL_ERROR`. Run never publishes `submission.accepted`.

## Configuration

- `.env` (local, gitignored, created from `.env.example`): set `*_DATABASE_URL` to the shared PostgreSQL
  host on port 6789, `POSTGRES_PORT`, `REDIS_URL`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD` and `RABBITMQ_URL` to
  the shared host, and generated new local `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` and `INTERNAL_SERVICE_SECRET`.
- No change to `.env.example`, `libs/config`, Docker or package scripts.

## Verification

- Commands run and their results:
  - `pnpm test`: 17 suites, 72 tests passed.
  - `pnpm build:submission`: passed.
  - `pnpm lint` / `pnpm typecheck`: only the existing `heheh` error in `apps/learning-service/src/database/data-source.ts:14`.
  - `pnpm migration:run:submission` against `bkpractice_submission` (PostgreSQL 18.6): the `migrations` table
    was created; `InitialSubmissionSchema`, `AddRunStdin`, `AddExecutedSubmissionStatus` and
    `AddSubmissionPublicIdAndIndex` ran, then COMMIT.
  - `node dist/apps/submission-service/main.js`: all modules initialised (TypeORM, RabbitMQ), routes mapped,
    `GET /health` returned `ok`.
- Not verified: a real `POST /api/run` against the shared stack (it would write rows to the team database and
  queue a job), Judge round trip, Redis publish (the connection is lazy), Gateway delivery to a socket.

## Remaining

- Not done: SUB-003 list pagination (`GET /api/submissions` still returns raw entities, including Submit
  stdout/stderr); a consumer-level test for an unknown `submissionId`; a test that a repeated request creates
  a new record; the `submission-service.md` status update; the operations note for the migrations; the full
  FR/SR/AC traceability pass.
- Risks: Submit flow (SUB-002) still writes `score ?? 0`, emits `score || 100`, starts at `QUEUED` and has no
  outbox or watchdog. Entity metadata does not name `UQ_submissions_public_id` or the owner index, so
  `migration:generate` will show drift. The shared database now has the four migrations applied; teammates
  must not run a separately generated initial schema against it.
