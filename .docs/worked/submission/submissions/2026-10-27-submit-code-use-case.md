# 2026-10-27 — Submit through SubmitCodeUseCase, Learning package port and a shared watchdog

- Author: Claude (on `feature/submission-service`, after `2026-10-27-submit-result-outbox.md`)
- Scope: the SUB-002 "create Submit" half: `POST /api/submissions` through a use case and ports,
  Submit support in the judge-job adapter, and the 10-minute watchdog extended from Run to Submit

## Spec and plan

- Spec: `.docs/specs/03-submission/submit-code/spec.md` (SUB-002 v1.0)
- Plan: `.docs/specs/03-submission/submit-code/plan.md` — "Tầng application" (`SubmitCodeUseCase`), plan steps 1, 5 and 7 (watchdog)
- Tasks: `.docs/specs/03-submission/submit-code/tasks.md`
- Spec status at start: Approved

## Questions clarified

| Question                                                                                      | Conclusion                                                                                                                                                                                                                                                                  | Source                                                        |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Which HTTP status means "Problem or language not available for submission"?                   | `404` with that message. It carries Learning's `404` through and does not claim a cause.                                                                                                                                                                                    | SUB-002-FR-002; user decision                                 |
| What happens to `SubmissionsService.list()`?                                                  | It stays until SUB-003 replaces it with `ListSubmissionHistoryUseCase`. Only `submit()` was removed.                                                                                                                                                                        | SUB-003 plan, "Ảnh hưởng tới mã nguồn hiện có"; user decision |
| Is the Submit watchdog in scope?                                                              | Yes. The existing Run watchdog now expires PENDING/QUEUED records of both kinds that are older than 10 minutes.                                                                                                                                                             | SUB-002 "Vòng đời", FR-021; plan step 7; user decision        |
| Does Learning's judge-package endpoint enforce `PUBLISHED`, not-deleted and language-enabled? | **No.** `apps/learning-service/src/modules/problems/problems.controller.ts:37-68` returns `404` only when the Problem does not exist. The plan says not to modify Learning, so Submission implements the contract (`404` → not submittable). The gap is recorded as a risk. | LRN-002-FR-015; SUB-002 plan "Ảnh hưởng"; code read           |
| Is a new `ValidationPipe` needed?                                                             | No. `configureHttpApp` already sets `whitelist` and `forbidNonWhitelisted`.                                                                                                                                                                                                 | `libs/common/src/bootstrap.ts:20-23`                          |
| What if a very fast verdict moves the record past `PENDING` before `markQueued` runs?         | The request still returns `202 QUEUED`, because the job was dispatched. A `null` from `markQueued` is not an error.                                                                                                                                                         | SUB-002-FR-008 (accepted, not judged)                         |

## What was done

**Domain**:

- `createSubmitRecord` creates a `PENDING` Submit with `stdin = ''`.
- The new port `domain/ports/learning-judge-package.port.ts` declares `LearningJudgePackagePort`, the
  `JudgePackage` shape, and two errors: `ProblemNotSubmittableError` (Learning refused) and
  `JudgePackageUnavailableError` (Learning unreachable or 5xx).
- `JudgeJobPort.publish` now takes `RunJudgeJob | SubmitJudgeJob`.
- The repository port methods became kind-agnostic:
  - `markRunQueued` / `markRunFailedToDispatch` → `markQueued` / `markFailedToDispatch` (only from `PENDING`).
  - `expireStaleRuns` → `expireStaleSubmissions`.

**Application**:

- New `SubmitCodeUseCase`.
- `ExpireStaleRunsUseCase` became `ExpireStaleSubmissionsUseCase`. It notifies each expired record with
  its own kind.
- `RunCodeUseCase` only follows the renamed repository methods.

**Infrastructure**:

- `HttpLearningJudgePackageAdapter` replaces `LearningJudgeClient`, which is deleted. It maps Learning's
  `404` to `ProblemNotSubmittableError` and every other failure to `JudgePackageUnavailableError`. It
  never forwards Learning's response body.
- `RabbitJudgeJobAdapter` builds a `SUBMIT` `JudgeRequest` from the package. That request carries the
  problem type, test cases, harness and limits.
- `RunWatchdog` became `SubmissionWatchdog`.
- The repository drops the `kind = RUN` filter from the pending transition and from the expiry SQL.

**Presentation**:

- `POST /api/submissions` now requires `x-auth-user-id` (`401` otherwise) and calls the use case.
- The endpoint maps `ProblemNotSubmittableError` → `404` and `JudgePackageUnavailableError` → `503`.
- It returns `SubmitCodeResponseDto` with `id` (public ID), `kind`, `status`, `problemId`, `language`
  and `createdAt`. Before, it serialized the whole entity: source code, internal ID, score fields and
  event IDs.
- `CreateSubmissionDto` was renamed to `SubmitCodeRequestDto`, and `problemId` must now be a UUID v4.
- `SubmissionsService` keeps only `list()`.

What callers can now do or observe:

- A Submit with no trusted owner is rejected before any work starts.
- A Problem that Learning refuses gives a clean `404`, and no record is created.
- The `202` response no longer leaks entity fields.
- A Submit whose result never arrives ends as `INTERNAL_ERROR` after 10 minutes instead of staying
  `QUEUED`.

## Why these choices

- **Fetch the package before saving.** FR-021 and the failure table say that a Learning failure must
  leave no record. Fetching first makes that automatic.
- **Typed port errors, mapped in the controller.** The application layer stays free of Nest HTTP
  exceptions, as `dependency-rules.md` requires for the application layer. The controller is the
  presentation boundary that turns domain outcomes into status codes.
- **Make the pending transitions kind-agnostic instead of adding Submit copies.** The rule is
  identical for both kinds ("only from PENDING"), and the SQL guard is what makes it atomic. A second
  pair of methods would duplicate it.
- **Generalize the watchdog instead of adding a second one.** SUB-001 and SUB-002 specify the same
  10-minute rule from creation time, so a single sweep covers both. The use case and class were
  renamed so the names match what they do.
- **Use a judge-package type owned by the port.** Learning's response type is local to the Learning
  controller and not a shared contract, and Submission must not import Learning source. The port
  declares the fields Submission relies on.
- **Do not turn a `null` from `markQueued` into an error.** The job is already on the broker, and its
  verdict may already be stored. Failing the HTTP request would tell the student the submission failed
  when it did not.

## How the feature works

1. The student calls `POST /api/submissions` through the Gateway. The Gateway verifies the token and
   forwards `x-auth-user-id`.
2. `ValidationPipe` accepts only `problemId` (UUID v4), `language` (shared catalogue) and `sourceCode`
   (1–100 000 chars). Any other field is rejected.
3. `SubmissionsController.submit` rejects a missing owner with `401`, then calls
   `SubmitCodeUseCase.execute`.
4. The use case asks `LearningJudgePackagePort` for the package by `problemId + language`.
   - If Learning answers `404`, the use case throws `ProblemNotSubmittableError` and the student gets
     `404 "Problem or language is not available for submission"`.
   - On any other failure, the student gets `503`.
   - In both cases no record is created and no job is published.
5. The use case saves a `PENDING` Submit, then publishes a `SUBMIT` `JudgeRequest` built from the
   package. The source code travels only in `sourceCode`.
   - If the publish fails, the record moves to `INTERNAL_ERROR` and the error propagates.
   - If the publish succeeds, the record moves to `QUEUED`.
6. The student receives `202` with the public ID and the queued status. No verdict and no judge data
   are included.
7. The verdict later arrives through `JudgeResultConsumer` → `ApplySubmitJudgeResultUseCase`, as
   described in the outbox worked entry.
8. Every 60 s, `SubmissionWatchdog` runs `ExpireStaleSubmissionsUseCase`. Run or Submit records still
   `PENDING`/`QUEUED` 10 minutes after creation move atomically to `INTERNAL_ERROR`, and the owner is
   notified. A late verdict for such a record is ignored because it is terminal.

## Configuration

No configuration change. The adapter reads the existing `LEARNING_INTERNAL_URL` and
`INTERNAL_SERVICE_SECRET` keys, which `LearningJudgeClient` already used.

## Verification

- Commands run and their results:
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed. The earlier Learning `heheh` line is gone.
  - `pnpm test`: 24 suites, 127 tests passed. New suites: `submit-code.use-case`,
    `http-learning-judge-package.adapter`, and the renamed `expire-stale-submissions` and
    `submission-watchdog`. Extended suites: controller, Rabbit judge-job adapter, repository, domain.
  - `pnpm build:submission`: compiled successfully.
- Not verified:
  - No end-to-end Submit against running Learning, RabbitMQ and Judge.
  - There is no dedicated test that `SubmitCodeRequestDto` rejects extra fields. The global
    `forbidNonWhitelisted` covers this, but no test exercises it.
  - It is not verified that `LEARNING_INTERNAL_URL` bypasses the Gateway.

## Remaining

- Not done:
  - SUB-003 history (`ListSubmissionHistoryUseCase`) and removing `SubmissionsService`.
  - A real PostgreSQL concurrency test for AC-009.
  - Moving the controller and consumer into `presentation/` and the entities into `infrastructure/`.
  - The operations note for the `score` migration.
- Risks:
  - **Learning gap.** Until LRN-002-FR-015 is implemented in Learning, Learning hands out packages for
    unpublished or soft-deleted Problems and for disabled languages. SUB-002-AC-002 and the "not ready"
    part of AC-003 therefore do not hold end-to-end. Submission needs no change once Learning starts
    returning `404` for those cases.
  - `GET /api/submissions` still returns raw entities, including `stdout`/`stderr`, until SUB-003.
  - Run records whose `PENDING → QUEUED` transition loses a race with a fast verdict still throw in
    `RunCodeUseCase`. This is SUB-001 behaviour and was left unchanged.
