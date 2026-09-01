# BKPractice Backend Agent Instructions

These instructions apply to the entire `bkpractice-backend` repository.

## Sources of truth

Before making changes, inspect the repository and read the documents relevant to the target
service and feature.

Use this precedence when instructions conflict:

```text
System architecture and ADRs + Approved spec.md
    > plan.md
    > tasks.md
    > implementation assumptions
```

- Architecture and service boundaries are authoritative under `docs/architecture/` and
  `docs/adr/`.
- The SDD workflow and system-level rules are defined by `specs/README.md` and
  `specs/00-system/`.
- An Approved `spec.md` defines WHAT. Do not modify it unless explicitly instructed.
- `plan.md` defines HOW, and `tasks.md` is the implementation checklist. Neither may expand the
  Approved specification.
- If architecture, specification, plan, tasks, and code conflict, report the conflict instead of
  silently changing requirements or architecture.

## Spec-Driven Development workflow

Documentation-only tasks must not modify source or configuration, install dependencies, create or
run migrations, or advance to another SDD phase unless explicitly requested.

Before implementing a feature:

1. Inspect `git status`, the existing code, and the target service structure.
2. Read the relevant architecture and ADR documents.
3. Read the feature `spec.md` and confirm `Status: Approved`.
4. Read the reviewed `plan.md` and `tasks.md`.
5. Stop and report any unresolved decision or material conflict.

During implementation:

- Follow the selected service architecture and dependency rules.
- Implement only behavior traceable to the Approved specification and tasks.
- Do not add Out-of-Scope functionality or introduce architecture changes without approval.
- Work incrementally and mark a task complete only after it is implemented and verified.
- Preserve unrelated user changes in the worktree.

After implementation:

- Run relevant tests and the applicable validation commands.
- Verify implementation against every requirement, security requirement, acceptance criterion,
  service boundary, and architecture rule.
- Update `tasks.md` honestly and report deviations, unverified behavior, and remaining risks.

## Architecture boundaries

- Identity, Learning, Submission, and Community follow the Clean Architecture dependency rules in
  `docs/architecture/dependency-rules.md`.
- API Gateway follows Gateway Pattern + Layered Architecture and must not own business persistence.
- Judge follows Worker + Pipeline + Adapter architecture and treats submitted code as untrusted.
- A service must not access another service's database, repository, entity, migration, or source
  internals.
- Keep service-owned business entities and use cases out of generic shared libraries.
- Controllers and message consumers handle transport concerns; business workflows belong in
  application use cases.
- Infrastructure implements real application/domain boundaries. Do not add abstractions solely for
  appearance.

## Repository tooling and safety

- Use `pnpm` for repository dependencies and scripts. Do not use npm, Yarn, or Bun for project
  dependency management, and do not create their lockfiles. External developer tools may use their
  officially supported installer as long as repository manifests and lockfiles are not changed.
- Use the scripts that actually exist in `package.json`; do not invent validation commands.
- Use TypeORM migrations for schema changes. Do not replace migrations with `synchronize=true`.
- Never commit secrets, credentials, raw tokens, passwords, or sensitive user data.
- Do not open, read, search, print, parse, or source `.env` files or secret-bearing `.env.*`
  variants, including through CodeGraph or another indexing/search tool. Only documented templates
  such as `.env.example` may be inspected.
- Do not log Authorization headers, plaintext passwords, or raw refresh tokens.
- Treat `.codegraph/` as a generated local index: do not manually edit its contents or commit it.
- Do not run destructive Git, filesystem, database, or migration operations without explicit scope
  and authorization.
- Do not create commits or push branches unless the user explicitly requests it.
- Prefer `rg` and `rg --files` for exact text and filesystem searches.

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

## Definition of Done

Apply `specs/00-system/definition-of-done.md` proportionally. At minimum, applicable work must be
architecture-compliant, traceable to the Approved specification, tested, documented when contracts
change, and validated with the repository's `pnpm` scripts. Irrelevant checks may be marked N/A only
with a concrete reason.
