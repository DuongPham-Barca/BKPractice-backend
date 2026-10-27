# 2026-10-27 — Submission history list with keyset pagination (SUB-003)

- Author: Claude (on `feature/submission-service`, after the Submission layout task)
- Scope: SUB-003 list side. It adds `GET /api/submissions` with filters and cursor pagination,
  and removes the legacy `SubmissionsService`. The detail side (`GET /api/submissions/:publicId`,
  `public_id` and its index) already existed from SUB-001 and was re-checked against the spec.

## Spec and plan

- Spec: `.docs/specs/03-submission/submission-history/spec.md` (SUB-003 v1.0)
- Plan: `.docs/specs/03-submission/submission-history/plan.md`
- Tasks: `.docs/specs/03-submission/submission-history/tasks.md`
- Spec status at start: Approved

## Questions clarified

| Question                                                                                                                                                                                                | Conclusion                                                                                                                                                                                                         | Source                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| FR-012 / AC-007 ask for a "runtime error message" in the detail, but FR-011 / SR-005 forbid returning Submit `stderr`, the only place a runtime message exists today. What does a Submit detail return? | Option (a): only the `RUNTIME_ERROR` status, with no runtime message for Submit. Compile diagnostics (`compileOutput`, `error`) still come from Judge's compile step. Run detail keeps `stdout`/`stderr`.          | User decision (option a); SUB-003-FR-011, SR-005                            |
| Does history include Run? SUB-001's table says "Vào lịch sử nộp bài: Không".                                                                                                                            | Yes, by default (SUB-003-FR-002). `kind=SUBMIT` gives the official-submission set that SUB-001 refers to.                                                                                                          | SUB-003-FR-002; SUB-001 output section                                      |
| Is the Problem title snapshotted?                                                                                                                                                                       | No. `problemTitle` is `null` in v1, and history never calls Learning.                                                                                                                                              | SUB-003 approved decisions; plan "Về tiêu đề Problem"                       |
| How is the cursor timestamp represented?                                                                                                                                                                | As an ISO string at PostgreSQL's microsecond precision, produced by the database (`to_char(... 'US')`). A JS `Date` rounds to milliseconds, which would break `created_at = $cursor` ties and skip or repeat rows. | SUB-003-FR-005/006; existing rows created with DB `now()` have microseconds |
| What happens to `SubmissionsService`?                                                                                                                                                                   | It is deleted. Its only method, `list()`, returned entities including `stdout`/`stderr`.                                                                                                                           | SUB-003 plan, "Ảnh hưởng"                                                   |

## What was done

**Domain**: new `domain/submission-history.ts` with:

- `SubmissionHistoryFilter` (optional `kind`, optional `problemId`);
- `HistoryCursor` (`createdAt` string plus `publicId`);
- `HistoryPage<T>`;
- `matchesFilter`.

**Port**: `SubmissionRepositoryPort.listByOwner(ownerId, filter, cursor, take)` returns
`{ items: SubmissionHistoryRecord[], total }`. A `SubmissionHistoryRecord` carries the size of the
source code, not the code itself, and no raw output.

**Application**: new `ListSubmissionHistoryUseCase`.

- It validates `limit` (1–100, default 20) and asks the port for `limit + 1` rows, so it knows
  whether another page exists.
- As defence in depth, it drops any row whose owner or filter does not match.
- It returns the allow-listed `SubmissionHistoryItem` with `id = publicId` and
  `problemTitle = null`.
- Result fields are `null` for records without a final verdict.
- It computes `totalPages = ceil(total / limit)` and builds `nextCursor` from the last row's
  database-precision timestamp.

**Infrastructure**: `TypeormSubmissionRepository.listByOwner` uses parameterised SQL.

- The `WHERE` clause always starts with `"user_id" = $1`; `kind` and `problem_id` conditions are
  only ever added after it.
- An exact `COUNT(*)` runs with the same conditions but without the cursor.
- The page query adds the compound cursor condition
  `created_at < $c OR (created_at = $c AND public_id < $id)`, orders by
  `created_at DESC, public_id DESC`, and applies `LIMIT`.
- It selects explicit columns plus `LENGTH(source_code)`, and never joins `submission_results`.

**Presentation**:

- `GET /api/submissions` now requires `x-auth-user-id` (`401` otherwise).
- It accepts `kind`, `problemId`, `cursor`, `cursorId` and `limit` through
  `ListSubmissionHistoryQueryDto`:
  - `@IsIn` for `kind`, `@IsUUID('4')` for the IDs, strict `@IsISO8601` for `cursor`;
  - `@Type(Number)` with `@IsInt`, `@Min(1)` and `@Max(100)` for `limit`;
  - `@ValidateIf`, so a half cursor is rejected.
- It returns `SubmissionHistoryPageDto` (`items`, `total`, `totalPages`, `nextCursor`).
- Swagger is documented for both routes.
- `SubmissionsService` is deleted.

**Docs**: `submission-service.md` and the `service-architectures.md` matrix now mark Submission as
**ALIGNED**. The SUB-001 and SUB-002 tasks items about "filter by `userId` before paging" are ticked.

What a student can now do:

- Page through their own Run and Submit history, newest first, 20 at a time by default, filtered by
  kind or Problem.
- Get an exact total.
- Never see source code, `stdout` or `stderr` in the list, or Submit output anywhere.

## Why these choices

- **Raw parameterised SQL** (as `expireStaleSubmissions` already does) makes the owner-first rule,
  the compound cursor and the microsecond cursor text explicit and testable, instead of depending on
  TypeORM's property-name rewriting inside expressions. Values are always bound parameters; only
  fixed column names are concatenated.
- **Fetching `limit + 1` rows** decides whether a next cursor exists without a second page query.
- **Deciding "no result yet" by status (`isTerminal`)** instead of joining `submission_results`
  keeps the list query on one table and the existing `(user_id, created_at DESC, public_id DESC)`
  index. It also hides legacy pending rows that stored `score = 0`.
- **A defence-in-depth filter in the use case** keeps the owner boundary even if a future adapter
  change drops a condition. That boundary is the main security requirement (SR-001, SR-002).
- **The owner never appears in the query DTO.** With the global `forbidNonWhitelisted`, a `userId`
  or `ownerId` query parameter is rejected with `400`.

## How the feature works

1. The client calls `GET /api/submissions?kind=SUBMIT&limit=20` through the Gateway. The Gateway
   verifies the token and sets `x-auth-user-id`.
2. `ValidationPipe` checks the query. An unknown field, a half cursor, a bad UUID or kind, or a
   limit outside 1–100 gives `400`.
3. `SubmissionsController.list` rejects a missing owner with `401`, then calls
   `ListSubmissionHistoryUseCase` with the owner, the filter, the cursor (or `null`) and the limit.
4. The use case calls `listByOwner(owner, filter, cursor, limit + 1)`. The repository counts the
   owner's matching rows, then reads at most `limit + 1` rows after the cursor in
   `created_at DESC, public_id DESC` order.
5. The use case keeps the first `limit` rows and maps them to list items. If an extra row came back,
   it sets `nextCursor = { createdAt: <last row, microsecond ISO>, publicId }`.
6. The client gets `{ items, total, totalPages, nextCursor }`. To load the next page, it sends
   `cursor=nextCursor.createdAt&cursorId=nextCursor.publicId`. `nextCursor` is `null` on the last
   page, and an owner with no records gets `{ items: [], total: 0, totalPages: 0, nextCursor: null }`.
7. `GET /api/submissions/:publicId` (unchanged) looks the record up by public ID (or legacy ID) and
   owner, and returns the same `404` for missing and foreign records. Only Run includes
   `stdout`/`stderr`.

## Configuration

No configuration change. No migration: `public_id` and `IDX_submissions_owner_created` come from
`1792515603000-AddSubmissionPublicIdAndIndex`, which already ran on the shared database.

## Verification

- Commands run and their results:
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed.
  - `pnpm test`: 30 suites, 155 tests passed. New suites: `submission-history` domain,
    `list-submission-history.use-case`, and `list-submission-history.query.dto` (through the real
    `ValidationPipe` with the global options). Extended suites: the repository history SQL and the
    controller history tests.
  - `pnpm build`: all 6 applications compiled.
  - One test failure found and fixed: the count query was given the same `params` array that was
    later extended for the page query. It was harmless at runtime, but the array is now copied.
  - Live run (`pnpm dev:submission` against the shared PostgreSQL and RabbitMQ; Redis was
    unreachable). Calls went directly to port 3003 with a test owner `11111111-…`. Three Run records
    were created through `POST /api/run` and left in the shared database:
    - `GET /api/submissions?limit=2` → `200`, `total=3`, `totalPages=2`, items limited to the 14
      list fields. The next page via `nextCursor` returned the third record and `nextCursor=null`;
      3 records across both pages, no duplicates.
    - `kind=SUBMIT` → empty page.
    - No owner header → `401`.
    - A half cursor, `limit=101` or a `userId` query parameter → `400`.
    - Another owner's list → empty.
    - Own detail → `200` with Run `stdout`/`stderr`. A foreign or missing public ID → identical
      `404`.
- Not verified:
  - Keyset paging with tied `created_at` values on a real database (AC-004). The live run had
    distinct timestamps.
  - That `EXPLAIN` uses `IDX_submissions_owner_created` for the cursor query.
  - Account-lock and expired-token behaviour (AC-017), which belongs to the Gateway and Identity.
  - A live start-up of the service.

## Remaining

- Not done:
  - A real-database paging test.
  - An `EXPLAIN` check.
  - Mapping each `FR-001` to `FR-020` / `SR` / `AC` item formally.
  - Moving the spec to `Implemented` through review.
- Risks:
  - The exact `COUNT(*)` runs on every page. It uses the owner index and is acceptable for personal
    history (as the plan states), but grows with history length.
  - Submit compile diagnostics come straight from Judge. For `FUNCTION`/`OOP` problems the hidden
    harness is compiled together with the student code, so a compile error could quote harness
    lines. SUB-003-SR-007 puts that filtering on Judge (JDG specs, out of scope here).
