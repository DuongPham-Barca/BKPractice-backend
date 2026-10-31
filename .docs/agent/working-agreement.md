# Working agreement

This document is the mandatory process for every change in the `bkpractice-backend` repository.
`AGENTS.md` only points here. It does not repeat these steps. Before editing any file, open this
document from that pointer and follow it.

This process operates the Spec-Driven Development workflow defined in [`specs/README.md`](../specs/README.md).
It must not loosen the requirements of an Approved `spec.md`, and it must not change the architecture in
[`.docs/architecture/`](../architecture/system-architecture.md) or [`.docs/adr/`](../adr/0001-service-specific-internal-architectures.md).

## Sources of truth

When product requirements conflict, use this order:

```text
System architecture and ADRs + Approved spec.md
    > plan.md
    > tasks.md
    > implementation assumptions
```

The six steps in this document are a mandatory process. A line in `tasks.md` must not skip the
clarification step or the worked-log step. This agreement must not add product requirements.

- Architecture and service boundaries live in `.docs/architecture/` and `.docs/adr/`.
- The SDD workflow and system-level rules live in `specs/README.md` and `specs/00-system/`.
- An Approved `spec.md` defines WHAT. Do not modify that file unless explicitly instructed.
- `plan.md` defines HOW. `tasks.md` is the implementation checklist. Neither may add new requirements.
- If architecture, spec, plan, tasks, and code conflict, stop and report the conflict. Do not change requirements or architecture on your own.

## Mandatory steps

Do not skip a step. Do not edit product code while an earlier step is still open.

```text
spec.md (Status: Approved)
    -> plan.md + tasks.md
    -> clarify open questions
    -> implement
    -> verify
    -> write .docs/worked/
```

### Step 1. Spec

Goal: know exactly what must be done, and what is out of scope.

Do this:

1. Identify the feature and the path to its `spec.md`.
2. Read the whole spec, including requirements, rules, inputs, outputs, failures, acceptance criteria, and Out of Scope.
3. Confirm `Status: Approved`. A `Proposed` spec must not be implemented.
4. Read the architecture of the service that will change, and the related ADRs.

Stop when:

- There is no `spec.md`.
- Status is not `Approved`.
- The spec conflicts with the architecture.

A documentation-only change to this process, explicitly requested by the user, does not need a new
feature spec. Record that reason in the worked entry at step 6. That work still must not modify
source, runtime configuration, dependencies, or migrations.

Done when: an Approved spec exists, or the user explicitly requested a documentation change and the reason will be recorded in the worked entry.

### Step 2. Plan and tasks

Goal: know how to implement the spec without expanding it.

Do this:

1. Read the reviewed `plan.md`. The plan must point at the Approved spec and at the correct service architecture.
2. Read `tasks.md`. Treat it as a checklist, not as a place where new requirements appear.
3. Inspect `git status`, the existing code, and the structure of the service that will change.

Stop when the plan or tasks add behavior the spec does not contain, or when a feature that needs implementation has no plan or tasks.

Done when: the spec, plan, and tasks agree, and the plan is not broader than the spec.

### Step 3. Clarify open questions

Goal: do not guess at anything that would change the result.

This step is mandatory before editing files. List every open question about:

- behavior the spec has not settled
- scope, including Out of Scope
- service boundaries and architecture
- API, message, and data contracts
- configuration: environment variables, ports, Docker, scripts, secrets

For each question:

- If the answer would change behavior, scope, architecture, or a contract, stop and ask the user.
- If the repository already settles the answer, cite the source (file and rule) instead of asking again.
- Do not fill a gap with an assumption.

Record each question and its conclusion in the "Questions clarified" section of the worked entry at step 6. Do not edit an Approved `spec.md` only to store a question, unless a spec change was requested.

Done when: no open question would change behavior, or the user has settled each of those questions.

### Step 4. Implement

Start this step only after steps 1, 2, and 3 are done.

- Follow the selected service architecture and dependency rules.
- Implement only behavior traceable to the Approved spec and the tasks.
- Do not add Out-of-Scope functionality.
- Do not change the architecture without approval.
- Work one task at a time. Mark a task complete only after it is implemented and verified.
- Preserve unrelated changes in the worktree.
- Controllers and consumers handle transport only. Business workflows belong in application use cases.
- Infrastructure implements real application/domain boundaries. Do not add an abstraction only so that one appears to exist.
- Write code according to "How to write code" below.
- Put documents produced during implementation in the place described by "Documentation by module" below.

### Step 5. Verify

- Run the relevant tests and the commands that actually exist in `package.json`. Do not invent commands.
- For a code change, check `specs/00-system/definition-of-done.md`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` when those items apply.
- Compare the implementation with every requirement, security requirement, acceptance criterion, service boundary, and architecture rule.
- Update `tasks.md` to match the work that was done. Mark an item N/A only with a concrete reason.
- Report deviations, unverified behavior, and remaining risks.

A documentation-only change does not run migrations, does not install dependencies, and does not record code-validation commands as having been run.

### Step 6. Write the worked entry

When a piece of work finishes, including a configuration-only change, create a file under [`.docs/worked/`](../worked/). Split notes into folders so the log stays easy to manage. Do not leave every entry as a loose file in `.docs/worked/`.

```text
.docs/worked/<area>/YYYY-MM-DD-short-name.md
```

`<area>` is:

- `agent` for a change to this process, the working agreement, or a repository-wide rule.
- `<service>` when the work belongs to one service: `api-gateway`, `identity`, `learning`, `submission`, `judge`, or `community`.
- `<service>/<module>` when the work belongs to one feature module. Use the same module name as the code directory `modules/<module>/`.

Examples:

```text
.docs/worked/agent/2026-09-23-working-agreement.md
.docs/worked/identity/auth/2026-09-23-login.md
```

Create a folder only when that area has an entry to write. Do not create empty folders.

One file per piece of work. A list of changed files is not enough. The entry must explain, in enough detail for the repository owner to follow it without reading the diff or the conversation:

- what was done
- why those pieces were used
- how the feature actually flows

The folder rules are also summarized in [`.docs/worked/README.md`](../worked/README.md).

Use this template:

```markdown
# YYYY-MM-DD — short title

- Author:
- Scope:

## Spec and plan

- Spec:
- Plan:
- Tasks:
- Spec status at start:

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| ...      | ...        | ...    |

## What was done

Explain the change in plain language. Name the files, modules, and behaviors that changed, then say what a caller or user can do now that they could not do before. Do not stop at a file list.

## Why these choices

For each meaningful choice, say why it was used. A choice is meaningful when it picks a module, a library, a pattern, a data shape, a message, or a configuration key. Tie the reason to the Approved spec, the service architecture, or code that already existed. Do not use this section to justify behavior the spec does not contain.

## How the feature works

Walk the flow in the order it actually runs, so the repository owner can follow it:

1. Who or what starts it.
2. Which boundary receives it, such as a controller, consumer, or worker.
3. Which use case runs, and what it asks the owning service to do.
4. What is saved, published, or returned.
5. What the caller or user observes.
6. What happens on the failure path the spec requires.

If this work is not a product feature, say that, then walk the process that changed instead.

## Configuration

List each change: file, key, and meaning. Do not record secret, token, or password values.
If configuration did not change, write `No configuration change.`

## Verification

- Commands run and their results:
- Not verified:

## Remaining

- Not done:
- Risks:
```

Rules for the Configuration section:

- Record the file name and the key that was added, changed, or removed.
- Record what the change means, not the secret value.
- Do not open, copy, or quote a real `.env` into the worked entry. Only a documented template, such as `.env.example`, may be inspected.

Done when: the worked file exists and the repository owner can tell, without opening the conversation or the diff, what changed, why those pieces were used, how the feature flows from start to the observed result, which spec was used, which questions were settled, which configuration changed, and what was not verified.

## Documentation-only work

When the user asks only for a documentation change:

- Do not modify source or runtime configuration.
- Do not install dependencies or create a new lockfile.
- Do not create or run migrations.
- Do not advance to another SDD phase.
- Still pass through the clarification step and still write a worked entry.

## How to write code

These rules apply when writing or editing TypeScript.

### Use `@/` for application-local imports

For new or changed imports within an application, use `@/` rooted at that application's `src/`
directory instead of relative `./` or `../` paths. For shared libraries, keep the existing
`@app/*` aliases; package imports keep their package names. Example inside Identity:
`import { User } from '@/modules/profiles/infrastructure/persistence/user.entity';`.

Identity already configures `@/`. For another application, add and verify the alias for its
TypeScript/Nest build, Jest tests, and any direct runtime or migration entry points before using it.
Do not convert unrelated imports solely to enforce this rule.

### Import through a barrel in each folder

When adding or changing an application module, maintain an `index.ts` in each source folder of that
module, including nested folders. Each index re-exports the source files directly in its folder and
the indexes of its child folders; do not export test files. Import through the narrowest appropriate
folder with `@/`, for example `@/modules/auth/infrastructure/persistence`.

Keep imports pointed at a specific file when importing through that file's own folder index would
create a circular dependency. Respect the service's layer dependency rules when choosing a barrel;
do not import a module-wide barrel from a lower layer merely to shorten a path.

### Use `any` only when the type cannot be expressed

Use `any` as little as possible. Use it only when the context is hard enough that a safe type cannot be written, for example a boundary with an untyped library or an external payload that is not yet checked.

`eslint.config.mjs` sets `@typescript-eslint/no-explicit-any` to error, so `any` fails `pnpm lint`. When that spot must still be handled:

- Keep it in one place. Do not let `any` spread into callers.
- Prefer `unknown`, then check the value before using it.
- If `any` is still required, write a one-line reason at that spot. Do not disable the rule for the whole file just because the type is inconvenient.

### Keep code short enough to read

Write the shortest code that still matches the spec and can still be read. Avoid extra code:

- a helper, wrapper, or abstraction that the spec and the architecture do not need
- an intermediate variable that only renames a value once
- a branch or comment that repeats what the code already says

Do not shorten code so far that a reader can no longer see what the function does.

### Name functions with an active verb

A function does one thing, so its name starts with a verb that says what it does. Do not name a function with an unclear noun.

- Use: `createSubmission`, `rejectExpiredToken`, `loadCourseById`
- Avoid: `submission`, `tokenStuff`, `courseData`, `handler`, `manager`

Class, entity, and data-type names stay nouns. The verb rule applies only to functions and methods.

### Use decorators for cross-cutting concerns

When a handler or consumer needs a cross-cutting value from the transport context, define it as a
decorator (`@...`) and attach it at the boundary.

- Use: `@TrustedPrincipal()` to read the trusted principal.
- Avoid: deep relative imports such as `../../common/...` to reach another file.

A decorator keeps the concern at the boundary and keeps handlers free of another module's folder
layout. Do not import a cross-cutting concern from another file with `../..`; use the repository path
aliases, such as `@app/common/...` or `@community/...`, instead.

## Documentation by module

When implementation has to add documentation, split it into one folder per module. Do not put several modules into one shared file.

Place the folder under the service that owns the module:

```text
.docs/pm/plan/<service>/<module>/
```

The same grouping is summarized in [`.docs/pm/plan/README.md`](../pm/plan/README.md).

`<service>` is one of: `api-gateway`, `identity`, `learning`, `submission`, `judge`, `community`.
`<module>` is the feature module inside that service. Use the same name as the code directory `modules/<module>/`, or the feature folder in `specs/` when the module does not have a code directory yet.

Example: Identity authentication documentation lives at `.docs/pm/plan/identity/auth/`, not in the same file as profile or rbac.

Create a folder only when that module has a document to write. Do not create empty folders to fill out a diagram.

These locations keep their current roles. Do not put new feature documents there:

- `.docs/architecture/` and `.docs/adr/` hold the settled architecture and decisions.
- `.docs/agent/` holds this working agreement.
- `.docs/worked/` is the log of finished work.

## Architecture boundaries

- Identity, Learning, Submission, and Community follow Clean Architecture in [`.docs/architecture/dependency-rules.md`](../architecture/dependency-rules.md).
- API Gateway follows Gateway Pattern + Layered Architecture and must not own business persistence.
- Judge follows Worker + Pipeline + Adapter and treats submitted code as untrusted.
- A service must not access another service's database, repository, entity, migration, or source internals.
- Keep service-owned business entities and use cases out of generic shared libraries.
- The full architecture matrix is in [`specs/00-system/architecture-reference.md`](../specs/00-system/architecture-reference.md).

## Repository tooling and safety

- Use `pnpm` for repository dependencies and scripts. Do not use npm, Yarn, or Bun for project dependency management, and do not create their lockfiles.
- Run only scripts that exist in `package.json`.
- Change schema with TypeORM migrations. Do not turn on `synchronize=true` in place of a migration.
- Never commit secrets, credentials, raw tokens, passwords, or sensitive user data.
- Do not open, read, search, print, parse, or source `.env` files or secret-bearing `.env.*` variants, including through CodeGraph or another index. Only a documented template such as `.env.example` may be inspected.
- Do not log Authorization headers, plaintext passwords, or raw refresh tokens.
- Treat `.codegraph/` as a generated local index. Do not edit it by hand and do not commit it.
- Do not run destructive Git, filesystem, database, or migration operations without explicit scope and authorization.
- Do not create commits or push branches unless the user explicitly requests it.
- Prefer `rg` and `rg --files` for exact text and filesystem searches.

## CodeGraph

If the repository root contains a `.codegraph/` directory, use CodeGraph before grep or before reading files when you need to understand or locate code.

- The MCP tool `codegraph_explore`, when available, returns the source of the relevant symbols and the call paths between them.
- The shell command `codegraph explore "<symbol names or question>"` prints the same output.
- If there is no `.codegraph/` directory, skip CodeGraph. Indexing is the user's decision.

The block between `<!-- CODEGRAPH_START -->` and `<!-- CODEGRAPH_END -->` in `AGENTS.md` is written by the CodeGraph tool. Do not copy those two markers into another file.

## Definition of done

Apply [`specs/00-system/definition-of-done.md`](../specs/00-system/definition-of-done.md) in proportion to the work.

At minimum, applicable work must match the architecture, be traceable to the Approved spec, have tests when code changes, be documented when a contract changes, be checked with the applicable `pnpm` scripts, and have a worked file. An unrelated check may be marked N/A only with a concrete reason.
