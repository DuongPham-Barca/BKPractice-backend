# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mandatory process (read first)

`AGENTS.md` is only a map; the binding process is `.docs/agent/working-agreement.md`. Before editing
product code: confirm an **Approved** `spec.md` (under `.docs/specs/`) plus `plan.md`/`tasks.md`,
list and settle open questions with the user (never fill gaps with assumptions), and after the work
write a worked entry at `.docs/worked/<service>[/<module>]/YYYY-MM-DD-short-name.md`
(template is in the working agreement). Precedence: architecture + ADRs + Approved spec > plan >
tasks. If they conflict with code, stop and report; do not change requirements or architecture
yourself. Definition of done: `.docs/specs/00-system/definition-of-done.md`.

Repository rules that are easy to violate:

- Use `pnpm` only (never npm/yarn/bun or their lockfiles). Run only scripts that exist in `package.json`.
- Never open, read, grep, or source `.env` or secret-bearing `.env.*`; only `.env.example` may be inspected.
- Schema changes go through TypeORM migrations; `synchronize` stays off.
- Do not commit or push unless explicitly asked. Commits follow Conventional Commits (types:
  feat, fix, refactor, perf, docs, test, build, ci, chore, revert), enforced by commitlint.
- `.codegraph/` exists: prefer `codegraph node|query|explore` over grep for locating symbols, and run
  `codegraph sync .` after changing source. Never hand-edit or commit `.codegraph/` contents.
- Project docs/worked entries are largely written in Vietnamese; follow the language of the surrounding file.

## Commands

```bash
pnpm install && pnpm env:setup        # env:setup creates .env from template; fill in secrets
pnpm infra:up                         # postgres + redis + rabbitmq via docker compose
pnpm migration:run:<identity|learning|submission|community>   # also :generate:/:revert:
pnpm dev                              # all six apps; or dev:gateway|identity|learning|submission|judge|community
pnpm build                            # or build:<app>; nest monorepo, webpack
pnpm lint | pnpm typecheck | pnpm format:check
pnpm test                             # jest --runInBand over all *.spec.ts
pnpm exec jest path/to/file.spec.ts --runInBand        # single file
pnpm exec jest -t "test name" --runInBand              # single test by name
pnpm judge:images:build               # sandbox images; Judge needs a Docker daemon
```

Integration specs (e.g. `problem.typeorm-repository.integration.spec.ts`) are skipped unless
`TEST_DATABASE_URL` is set, and it must point at a database whose name ends in `_test` or `_lrn001`.

Lint specifics: `no-explicit-any` is an error, `consistent-type-imports` is enforced, and
`import-x/order` requires alphabetized groups with blank lines between them.

## Architecture

NestJS monorepo (Node 22, pnpm 10): six apps in `apps/` and four libs in `libs/`. Ports: gateway 3000,
identity 3001, learning 3002, submission 3003, judge 3004, community 3005 (`/health`, `/docs` Swagger).

- **api-gateway** is the only public entry; verifies JWT, strips caller-supplied identity headers and
  re-derives them from the token, throttles, adds correlation IDs, and routes `/api/*` to services.
  It owns no persistence.
- **identity / learning / submission / community** each own their own PostgreSQL database (one dev
  server, four DBs), entities and migrations. No cross-service imports of entities, repositories,
  datasources, or migrations, and no cross-DB foreign keys.
- **judge** is a stateless RabbitMQ worker that runs untrusted code in Docker sandboxes (Hexagonal +
  Pipeline). It accepts no client-supplied compiler/filename/Docker args; it has no DB, aggregates, or repositories.
- Sync calls between services are REST (Submission fetches hidden judge data from Learning's internal
  endpoint, guarded by `INTERNAL_SERVICE_SECRET`). Async flow: `judge.request` -> Judge -> `judge.result`
  -> Submission -> `submission.accepted` -> Learning. Exchange/queue/routing names live in `libs/contracts`.
  Consumers are idempotent (terminal-state checks, `lastEventId`) with manual ACK, retry, and dead-letter queues.
- **libs** (`@app/common`, `@app/config`, `@app/contracts`, `@app/shared`) hold only context-neutral
  infrastructure, env validation, message contracts, and utilities. Business entities, use cases, and
  repositories must never go in `libs/`.

Path aliases (`tsconfig.json` and mirrored in `jest.config.ts`): `@app/*` for libs and `@gateway`,
`@identity`, `@learning`, `@submission`, `@judge`, `@community` for each app's `src`. Use aliases, never
`../..` to cross module boundaries. Adding an alias means updating both files.

### Internal architecture differs per service (ADR 0002)

Gateway = Layered; Identity/Submission/Community = Clean Architecture; Learning = DDD + Hexagonal;
Judge = Hexagonal + Pipeline. Code is feature-first under `modules/<feature>/` and grows
`domain/ application/ infrastructure/ presentation/` only when warranted. Dependency direction
(`.docs/architecture/dependency-rules.md`): presentation -> application -> domain, with infrastructure
implementing application/domain ports. Controllers/consumers handle transport only; workflows belong in
use cases. Several modules (e.g. Identity, Community) are still in a transitional, shallower shape.

### Learning `problems` module (the reference implementation of the target shape)

`apps/learning-service/src/modules/problems/` is the most fully layered module:

- `domain/`: `Problem` aggregate, immutable self-validating value objects, domain services
  (publish/content/contract validators), and the outbound `ProblemRepository` port.
- `application/`: one `*.use-case.ts` per operation, exposed through inbound ports in `ports/in/*.port.in.ts`
  (token `..._PORT_IN`) and command objects in `command/`; outbound ports in `ports/out/`
  (transaction runner, topic/tag reader); application errors in `errors/`.
- `infrastructure/`: TypeORM repository, persistence mapper (TypeORM entity <-> aggregate), transaction runner/context.
- `presentation/http/`: controllers, request/response mappers, `ProblemExceptionFilter`, and the
  `@TrustedPrincipal()` decorator / `TrustedPrincipalGuard` that read `x-auth-user-id|roles|permissions`
  (managed use cases take `Principal` as the first `execute()` argument; public reads are only guarded).
- DI wiring is in `problems.module.ts` using `Symbol` tokens from `problem.tokens.ts` and `@Inject(...)`;
  inbound ports are bound with `useExisting` to use-case classes, so controllers depend on the interface and call `execute()`.
  The TypeORM entities in `entities/problem.entity.ts` are the persistence model only; the aggregate is the domain model.
- Domain must not import `@nestjs/*`; domain validators are plain classes registered with `useFactory` in the module.
  Importing `@app/contracts` (`ProblemType`, `SupportedLanguage`) into domain is allowed by the plan.
- `problems.controller.ts` (internal judge-package route) intentionally keeps direct repository access; the plan marks it REUSE/unchanged.
- The managed routes need `x-auth-permissions` from the Gateway; that comes from Identity/Gateway work on `origin/feat/01-identity`
  and is not part of Learning.

Code style from the working agreement: functions/methods start with an active verb (`createSubmission`),
keep code short without hiding intent, use decorators (e.g. `@TrustedPrincipal()`) for cross-cutting
transport values, and prefer `unknown` over `any` (with a one-line reason if `any` is unavoidable).
