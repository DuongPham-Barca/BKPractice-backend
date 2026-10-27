# 2026-10-20 — Run submission domain foundation

- Author: Codex
- Scope: SUB-001 domain foundation and minimal shared ports

## Spec and plan

- Spec: `.docs/specs/03-submission/run-code/spec.md`
- Plan: `.docs/specs/03-submission/run-code/plan.md`
- Tasks: `.docs/specs/03-submission/run-code/tasks.md`
- Spec status at start: Approved

## Questions clarified

| Question                                              | Conclusion                                                                                                                                                     | Source                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| How much of SUB-001 is included?                      | Only the framework-independent domain foundation and three minimal ports; controllers, use cases, adapters, consumers and migrations remain out of this piece. | Approved plan plus the implementation plan confirmed in the conversation      |
| How complete should the port payloads be?             | Define the minimum Run-facing contracts now; history, verdict/outbox and public realtime fields remain with SUB-003, SUB-002 and SUB-004.                      | User selected “Port tối thiểu” during planning                                |
| Where do submission enums live?                       | The domain is the single source of truth. The TypeORM entity imports and re-exports the same enum objects for compatibility.                                   | `.docs/architecture/dependency-rules.md` and the approved implementation plan |
| Can this piece emit `submission.accepted`?            | No accepted-event port or event output exists in this domain slice. The behavioral result handler remains future work.                                         | SUB-001 Run rules and approved implementation plan                            |
| Should the existing Learning baseline error be fixed? | No. The `heheh` error is unrelated and remains outside SUB-001.                                                                                                | Baseline recorded before this implementation                                  |

## What was done

Added an immutable `SubmissionRecord` domain model with Run creation, dispatch transitions and a
framework-independent transition error. `SubmissionKind` and `SubmissionStatus` now live in the
domain, with `EXECUTED` added while preserving every existing serialized value. The persistence
entity uses those same enums without adding a column or migration.

The domain now defines terminal-state and wrong-answer eligibility rules. It also exposes minimal
repository, judge-job and realtime ports with framework-neutral `Symbol` tokens. Domain tests cover
record creation, optional problem identity, immutable transitions, invalid transitions, every status
in the terminal-state matrix and the Run/Submit distinction for `WRONG_ANSWER`.

## Why these choices

Pure functions keep lifecycle decisions independent of NestJS, TypeORM, RabbitMQ and Redis, matching
Submission's Clean Architecture boundary. Transition functions return new records so callers cannot
silently change a record that was already validated. A stable domain error code lets later use cases
translate failures without importing presentation exceptions.

The ports use internal domain shapes rather than `@app/contracts` transport payloads. Their scope is
intentionally small so this piece does not pre-empt the history, result-outbox or public realtime
contracts owned by later submission features.

## How the feature works

This piece does not yet change a user-visible request flow. A future Run use case can:

1. Call `createRunRecord` to obtain a `PENDING` Run record.
2. Save it through `SubmissionRepositoryPort`.
3. Publish its Run job through `JudgeJobPort`.
4. Call `markRunQueued` after dispatch succeeds, or `markRunFailedToDispatch` when dispatch fails.
5. Use `isTerminal` and `canProduceWrongAnswer` when later result handling is implemented.

No path in this foundation can publish `submission.accepted` because it has no accepted-event port.

## Configuration

No configuration change.

## Verification

- `pnpm test -- apps/submission-service/src/modules/submissions/domain/submission-record.spec.ts`:
  24 tests passed after the required RED/GREEN cycles.
- `pnpm test -- apps/submission-service/src/modules/submissions/entities/submission.entity.spec.ts`:
  1 test passed after proving the old entity enum failed the single-source contract.
- `pnpm test`: 4 suites and 27 tests passed.
- `pnpm build:submission`: passed; webpack compiled successfully.
- Targeted ESLint checks for both newly detected lint issues: passed after isolated fixes.
- `pnpm lint`: failed only on the existing `heheh` expression in
  `apps/learning-service/src/database/data-source.ts:14`.
- `pnpm typecheck`: failed only on the existing `TS2304` for `heheh` at the same location.
- `git diff --check`: passed.

Not verified: database enum persistence, migrations, controller/use-case behavior, Judge result
mapping, realtime delivery and accepted-event behavior. Those are intentionally outside this piece.

## Remaining

- Not done: the Application, Infrastructure, Migration, API, Messaging and Realtime tasks in
  SUB-001 remain unchecked.
- Risks: `EXECUTED` must not be persisted until its PostgreSQL enum migration is implemented. Full
  repository lint and typecheck remain blocked by the unrelated Learning baseline error.
