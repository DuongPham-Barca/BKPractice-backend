# 2026-10-27 — TrustedOwner decorator and path aliases

- Author: Claude (on `feature/submission-service`, after merging `main` at `da810d2`)
- Scope: bring Submission in line with the working-agreement rule "Use decorators for
  cross-cutting concerns". No new feature and no schema change.

## Spec and plan

- Rule: `.docs/agent/working-agreement.md`, section "Use decorators for cross-cutting concerns"
- Specs touched (behaviour unchanged except the owner check below): SUB-001, SUB-002, SUB-003
- Reference implementation: `apps/learning-service/src/modules/problems/presentation/http/decorators/trusted-principal.decorator.ts`

## Questions clarified

| Question                                                                                   | Conclusion                                                                                                                                            | Source        |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Should the decorator only check that `x-auth-user-id` exists, or be as strict as Learning? | Strict: exactly one header, and its value must be a UUID. Otherwise 401. A non-UUID value used to reach PostgreSQL's `uuid` column and fail with 500. | User decision |
| Convert only the cross-module `../..` imports in `run-code`, or every `../..` import?      | Every `../..` import in `apps/submission-service/src` becomes `@submission/...`. Single-level `../` and `./` imports stay as they are.                | User decision |

## What was done

- New `modules/submissions/presentation/decorators/trusted-owner.decorator.ts`:
  - `readTrustedOwner(request)` reads `x-auth-user-id` from `rawHeaders` (case-insensitive) and
    rejects a missing, empty, duplicated, or non-UUID value with `UnauthorizedException`.
  - `TrustedOwner` is the `createParamDecorator` wrapper.
- `SubmissionsController` (`POST/GET /api/submissions`, `GET /api/submissions/:publicId`) and
  `RunCodeController` (`POST /api/run`) take `@TrustedOwner() ownerId: string`. The helper
  `presentation/trusted-owner.ts` is deleted.
- 37 `../..` import paths, including 11 from `run-code` into `submissions`, now use
  `@submission/...`. The alias already existed in `tsconfig.json` and `jest.config.ts`, and webpack
  resolves it.

## Tests

- New `trusted-owner.decorator.spec.ts`: reads the header in any case; rejects missing, empty,
  non-UUID, and duplicated headers; ignores owner values in other headers, body, and query.
- Controller specs now pass a UUID owner. The "missing header" cases moved from the controller
  specs into the decorator spec, because the controller no longer sees a raw header.
- `pnpm typecheck`, `eslint` on Submission and Gateway, `jest apps/submission-service`
  (27 suites, 143 tests) and `pnpm build:submission` pass.

## Not done

- `codegraph sync .` could not run: the `codegraph` command is not installed on this machine.
- The Gateway still owns the guarantee that `x-auth-user-id` comes from a verified token; this
  change only rejects malformed values at the Submission boundary.
