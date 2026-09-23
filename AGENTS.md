# BKPractice Backend Agent Instructions

These instructions apply to the entire `bkpractice-backend` repository.

Run the workflow below, in order, for every change. The full rules are in
[`docs/agent/working-agreement.md`](docs/agent/working-agreement.md). Do not skip a step. Do not
edit product code while an earlier step is still open. If this file and the working agreement
disagree about a step, follow the working agreement.

## Workflow

### 1. Spec

Read the feature `spec.md` and confirm `Status: Approved`. Read the architecture of the service
that will change and the related ADRs. Stop if the spec is missing, not Approved, or conflicts
with the architecture. A `Proposed` spec is not implemented.

A documentation-only process change that the user explicitly requested does not need a new feature
spec. Record that reason in the worked entry. That work still must not modify source, runtime
configuration, dependencies, or migrations.

### 2. Plan and tasks

Read the reviewed `plan.md` and `tasks.md`. The plan must point at the Approved spec and must not
add behavior the spec does not contain. `tasks.md` is a checklist, not a source of new
requirements. Inspect `git status`, the existing code, and the service structure.

File module plans under `docs/pm/plan/<service>/<module>/`. Do not put several modules in one
shared plan, and do not create empty folders.

### 3. Clarify open questions

Before editing files, list every question that could change behavior, scope, architecture, a
contract, or configuration. If the answer would change one of those, stop and ask the user. If the
repository already settles it, cite the file and the rule. Do not fill a gap with an assumption.

### 4. Implement

Implement only behavior that traces to the Approved spec and the tasks. Follow the service
architecture and dependency rules. Do not add Out-of-Scope behavior or change the architecture
without approval. Work one task at a time, and mark a task complete only after it is implemented
and verified. Preserve unrelated worktree changes.

When writing TypeScript, avoid `any` unless the value cannot be typed safely. Prefer `unknown`.
`@typescript-eslint/no-explicit-any` is an error. Keep the change small. Name functions with an
active verb, not an unclear noun.

### 5. Verify

Run the relevant tests and the commands that exist in `package.json`. Do not invent commands. For
a code change, apply `specs/00-system/definition-of-done.md`, including `pnpm lint`,
`pnpm typecheck`, `pnpm test`, and `pnpm build` when those items apply. Compare the result with
every requirement, security requirement, acceptance criterion, service boundary, and architecture
rule. Update `tasks.md` honestly.

A documentation-only change does not run migrations, does not install dependencies, and does not
record those code commands as having been run.

### 6. Write the worked entry

When the work finishes, including a configuration-only change, write one file:

```text
docs/worked/<area>/YYYY-MM-DD-short-name.md
```

`<area>` is `agent` for this process, `<service>` for one service, or `<service>/<module>` for one
feature module. A file list is not enough. Explain, so the repository owner can follow it without
the diff or the conversation:

- what was done, and what a caller or user can do now
- why those modules, libraries, patterns, data shapes, messages, or configuration keys were used
- how the feature flows, from the trigger, through the boundary and use case, to the saved or
  returned result, and the failure path the spec requires

If the work is not a product feature, say so and walk the process that changed instead. Do not
record secrets, tokens, or passwords.

## Rules on every step

- For product behavior, precedence is architecture and ADRs plus an Approved `spec.md`, then
  `plan.md`, then `tasks.md`, then implementation assumptions. This workflow does not add product
  requirements.
- Do not modify an Approved `spec.md` unless explicitly instructed.
- If architecture, specification, plan, tasks, and code conflict, report the conflict instead of
  silently changing requirements or architecture.
- Use `pnpm` for repository dependencies and scripts. Do not create npm, Yarn, or Bun lockfiles.
- Use TypeORM migrations for schema changes. Do not replace migrations with `synchronize=true`.
- Never commit secrets, credentials, raw tokens, passwords, or sensitive user data.
- Do not open, read, search, print, parse, or source `.env` files or secret-bearing `.env.*`
  variants. Only documented templates such as `.env.example` may be inspected.
- Do not log Authorization headers, plaintext passwords, or raw refresh tokens.
- Do not run destructive Git, filesystem, database, or migration operations without explicit scope
  and authorization.
- Do not create commits or push branches unless the user explicitly requests it.

<!-- CODEGRAPH_START -->

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for
it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the
  relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch
  hops grep can't follow. Name a file or symbol in the query to read its current line-numbered
  source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
