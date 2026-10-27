# 2026-10-27 — Submission folder layout, run-code feature module and outbox port

- Author: Claude (on `feature/submission-service`)
- Scope: a behaviour-preserving architecture task for the Submission service. It moves files into
  layers, makes `run-code` a feature module, splits the outbox port, removes unused domain
  functions, and drops the entity's enum re-export.

## Spec and plan

- Spec: no new spec. The user approved this as a separate architecture work item.
  `architecture-reference.md` forbids wide folder rewrites inside a feature plan unless they are
  approved separately.
- Plan: the plan shown in conversation (item 3, option A for `run-code`).
- Tasks: N/A. The SUB-001 and SUB-002 task lists are unaffected because behaviour did not change.
- Spec status at start: SUB-001 and SUB-002 Approved and unchanged.

## Questions clarified

| Question                                                     | Conclusion                                                                                                                                                                       | Source                                                                                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Where does Run live?                                         | Option A: `modules/run-code` becomes a feature module with its own controller and module. It imports `SubmissionsModule`, which exports only the repository and judge-job ports. | SUB-001 plan, "Ranh giới module"; SUB-001 tasks ("run-code không import port của Submit"); `submission-service.md` growth areas; user decision |
| Do routes change?                                            | No. `POST /api/run` keeps its path and status code, so the Gateway needs no change.                                                                                              | Behaviour-preserving scope                                                                                                                     |
| What happens to `markRunQueued` / `markRunFailedToDispatch`? | They are removed, together with their tests. Production never called them; the repository's conditional updates are the transition rule, and the port comment now says so.       | 2026-10-27 structure review; user approval                                                                                                     |
| Where does `requireTrustedOwner` live?                       | In `submissions/presentation/trusted-owner.ts`. Run imports it, since `run-code` already depends on `submissions`.                                                               | Avoids duplicating the trust check                                                                                                             |

## What was done

Files moved (tracked files with `git mv`):

| From                                                                      | To                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `submissions/entities/*`, `infrastructure/typeorm-submission.repository*` | `submissions/infrastructure/persistence/`                    |
| `infrastructure/rabbit-*.adapter*`                                        | `submissions/infrastructure/messaging/`                      |
| `infrastructure/http-learning-judge-package.adapter*`                     | `submissions/infrastructure/http/`                           |
| `infrastructure/redis-realtime.adapter*`                                  | `submissions/infrastructure/realtime/`                       |
| `infrastructure/submission-watchdog*`, `accepted-event-relay`             | `submissions/infrastructure/scheduling/`                     |
| `submissions.controller*`, `judge-result.consumer*`, `dto/*`              | `submissions/presentation/` (DTOs under `presentation/dto/`) |
| `run-code/run-code.use-case*`                                             | `run-code/application/`                                      |
| `run-code/dto/*`                                                          | `run-code/presentation/dto/`                                 |

Structural changes:

- **`run-code` is now a feature module.**
  - New `RunCodeController` serves `POST /api/run`.
  - New `RunCodeModule` imports `SubmissionsModule` and builds `RunCodeUseCase` from the two
    exported ports.
  - `SubmissionsController` no longer has a Run endpoint.
  - The root module imports `RunCodeModule`.
- **Port split.**
  - New `AcceptedEventOutboxPort`, which only has `relayOldestPendingAcceptedEvent`.
    `SubmissionRepositoryPort` no longer contains it.
  - `TypeormSubmissionRepository` implements both ports. It is registered once and bound to both
    tokens with `useExisting`.
  - `RelayAcceptedEventsUseCase` depends only on the outbox port.
- **Domain cleanup.**
  - Removed the unused `markRunQueued`, `markRunFailedToDispatch` and `assertPendingRun`.
  - The test for the stable `INVALID_SUBMISSION_TRANSITION` code now goes through `applyVerdict`.
- **Entity.** `submission.entity.ts` no longer re-exports the domain enums. The entity spec now
  checks that the `kind` and `status` column metadata use the domain enums.
- **Boundary test.** The new `run-code.module.spec.ts` checks that `RunCodeModule` imports only
  `SubmissionsModule`, and that `SubmissionsModule` exports exactly the repository and judge-job
  ports and never `LEARNING_JUDGE_PACKAGE_PORT`.
- **Documentation.** `submission-service.md` now shows the current layout.

Callers see no change. Routes, payloads, messages, the schema and logging are all the same.

## Why these choices

- **The layer folders follow `service-architectures.md`** (feature-first, with
  `domain/application/infrastructure/presentation` once a feature is big enough). Infrastructure is
  sub-grouped by technology because Submission has five adapter kinds.
- **The module boundary enforces SUB-001-FR-004 through dependency injection.** It no longer relies
  on reviewers noticing a forbidden import.
- **The outbox gets its own port** because the relay never needs the rest of the 10-method
  repository (interface segregation). One TypeORM class still owns both, because both work on the
  same tables and transactions.
- **Dead domain functions were removed** rather than wired in. A second, unused copy of a transition
  rule can drift from the real rule in SQL.

## How the feature works

This is not a product feature. The request flows are the same as before; only the code that serves
them moved:

1. `POST /api/run` → `RunCodeController` (run-code) → `RunCodeUseCase` → the repository and
   judge-job ports exported by `SubmissionsModule`.
2. `POST /api/submissions` and `GET /api/submissions[/:publicId]` → `SubmissionsController`
   (submissions/presentation) → the Submit and detail use cases, or the legacy
   `SubmissionsService.list()`.
3. `judge.result` → `JudgeResultConsumer` (submissions/presentation) → the Run or Submit
   apply-result use case.
4. The outbox relay → `RelayAcceptedEventsUseCase` → `AcceptedEventOutboxPort` (the TypeORM
   repository) and `AcceptedEventPort`.

## Configuration

No configuration change.

## Verification

- Commands run and their results:
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed after `pnpm lint:fix` corrected 5 import-order findings in moved files.
  - `pnpm test`: 27 suites, 127 tests passed. The count dropped from 134 because 9 test cases of
    the removed domain functions are gone and 2 tests were added (the domain error-code test and the
    module boundary test).
  - `pnpm build`: all 6 applications compiled.
  - Live start-up (`pnpm dev:submission`):
    - `RunCodeModule` and `SubmissionsModule` initialised without DI errors.
    - The route map lists `RunCodeController` `POST /api/run` and `SubmissionsController`
      `POST /api/submissions`, `GET /api/submissions` and `GET /api/submissions/:publicId`.
    - `POST /api/run` returned `202`; a body with `testCases` returned `400`.
- Not verified: nothing further for this behaviour-preserving task.

## Remaining

- Not done: SUB-003 (next item).
- Risks: none beyond the unverified start-up above.
