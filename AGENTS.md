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

- The authoritative per-service architecture selection is
  `docs/adr/0002-revised-service-internal-architectures.md`, which supersedes ADR 0001.
- Identity, Submission, and Community (Clean Architecture) and Learning (DDD + Hexagonal) follow the
  shared dependency direction in `docs/architecture/dependency-rules.md`.
- Learning uses tactical DDD only — aggregate, value object, domain service, repository — inside one
  bounded context. An aggregate requires an invariant; do not create one per table.
- API Gateway follows Layered Architecture and must not own business persistence or a domain layer.
- Judge follows Hexagonal Architecture (Ports & Adapters) + Pipeline, stays stateless, and treats
  submitted code as untrusted. Judge has no aggregate, repository, or business database.
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
- Treat `.codegraph/` as a generated local index: commit only `.codegraph/.gitignore`; do not
  manually edit or commit its database, daemon files, sockets, or logs.
- Do not run destructive Git, filesystem, database, or migration operations without explicit scope
  and authorization.
- Do not create commits or push branches unless the user explicitly requests it.
- Prefer `rg` and `rg --files` for exact text and filesystem searches.

<!-- CODEGRAPH_START -->

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repository root), use
CodeGraph before grep/find or broad file reading when locating symbols or understanding code
relationships.

Choose the smallest suitable command:

1. Use `codegraph node <file-or-symbol>` when the file or symbol is already known.
2. Use `codegraph query "<keyword>"` for narrow symbol discovery.
3. Use `codegraph explore "<specific symbols or question>"` for multi-symbol behavior, dependencies,
   call paths, or dynamic dispatch.
4. Use `rg` directly for exact text, configuration, documentation, environment templates, generated
   files, or when CodeGraph returns no relevant result. Environment-file safety rules still apply.

When using `codegraph explore`, keep the query narrow and name relevant services, files, or symbols
whenever possible.

- **MCP tool** (when available): `codegraph_explore` returns relevant symbols' current source and
  call paths, including dynamic-dispatch relationships that text search may miss.
- **Shell fallback**: `codegraph explore "<specific symbols or question>"`.

After creating, deleting, moving, or changing source code, run:

```bash
codegraph sync .
```

Use `codegraph index .` only when a complete rebuild is required, such as after a corrupted or
materially stale index. Use `codegraph status .` to verify index health.

Treat `.codegraph/` as generated local data. Do not manually edit or commit its database, daemon
files, sockets, or logs. Only `.codegraph/.gitignore` may be committed.

If there is no `.codegraph/` directory, skip CodeGraph entirely. Index initialization is the user's
decision.
<!-- CODEGRAPH_END -->

## Definition of Done

Apply `specs/00-system/definition-of-done.md` proportionally. At minimum, applicable work must be
architecture-compliant, traceable to the Approved specification, tested, documented when contracts
change, and validated with the repository's `pnpm` scripts. Irrelevant checks may be marked N/A only
with a concrete reason.
