# Plan

Each plan lives in a folder for its area. Split plans the same way finished-work notes are split under `docs/worked/`. Do not leave plan files loose in this directory.

```text
docs/pm/plan/<area>/
```

`<area>` is:

- `agent` when the plan changes the process, the working agreement, or a repository-wide rule.
- `<service>` when the plan belongs to one service: `api-gateway`, `identity`, `learning`, `submission`, `judge`, or `community`.
- `<service>/<module>` when the plan belongs to one feature module. Use the same module name as the code directory `modules/<module>/`.

Examples:

```text
docs/pm/plan/agent/
docs/pm/plan/identity/auth/
```

Create a folder only when that area has a plan to write. Do not create empty folders.

A feature implementation still follows the Approved `spec.md` and the reviewed `plan.md` named by the
[working agreement](../../agent/working-agreement.md), step 2. File the plan for that module here, and do not put several modules into one shared plan. Do not record secrets, tokens, or passwords.
