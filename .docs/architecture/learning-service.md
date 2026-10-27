# Learning Service Architecture

## Selected style

Learning uses **DDD (tactical) + Hexagonal Architecture**, as decided in
[ADR 0002](../adr/0002-revised-service-internal-architectures.md).

Learning is the only application whose hard part is the model itself. Problem Management alone
carries a lifecycle with explicit transitions, publish-readiness invariants spanning type, enabled
languages, per-language contracts, starter code and execution limits, and a vocabulary that behaves
as a real ubiquitous language: Draft, Publish, Hold, Readiness, Visible Example, Hidden Harness.
DDD names how that model is built; Hexagonal names how it is kept free of framework details.

Problem/TestCase, Course, Assignment, Enrollment, Progress and Recommendation stay inside this one
bounded context. They must not be split into a Problem Service or Recommendation Service.

## The hexagon

```text
                    DRIVING SIDE (inbound adapters)
        ┌──────────────────────────────────────────┐
        │  REST controllers      RabbitMQ consumers │
        └────────────┬─────────────────┬───────────┘
                     │  invoke a use case
        ╔════════════▼═════════════════▼═══════════╗
        ║  APPLICATION — use cases, one per         ║
        ║  meaningful workflow                      ║
        ║  ┌────────────────────────────────────┐   ║
        ║  │  DOMAIN — aggregates, value        │   ║
        ║  │  objects, domain services,         │   ║
        ║  │  lifecycle, repository ports       │   ║
        ║  └────────────────────────────────────┘   ║
        ╚═══╤═══════════╤═══════════╤═══════════╤═══╝
            │ driven ports          │           │
        repository   reference    principal  transaction
            │        reader          │           │
        ┌───▼───────────▼────────────▼───────────▼───┐
        │  TypeORM      TypeORM     Gateway   DataSource │
        │  adapter      adapter     context   runner     │
        └────────────────────────────────────────────┘
                    DRIVEN SIDE (outbound adapters)
```

The value of the port boundary here is concrete, not decorative: publish-readiness rules and
lifecycle transitions become testable without PostgreSQL.

## Tactical DDD vocabulary

Used where an invariant justifies it, never per table:

- **Aggregate root** — a consistency boundary loaded and saved as a unit, e.g. a Problem together
  with its enabled languages, starter code and type-specific contract.
- **Value object** — an immutable value validated on construction, e.g. a slug, execution limits, a
  visible example, a per-language contract.
- **Domain service** — a rule that belongs to no single aggregate, e.g. publish-readiness
  validation shared by publish, management readiness display and preview.
- **Repository** — a driven port expressed in domain terms, implemented by a TypeORM adapter.

Strategic DDD is out of scope. Learning is one bounded context and stays one; there is no context
map, no anti-corruption layer and no second bounded context.

## Module layout

Preferred feature-first growth:

```text
modules/
├── problems/
├── courses/
├── assignments/
├── enrollments/
├── progress/
└── recommendation/
```

A module with real domain behavior adds `domain` (including `domain/repositories` for aggregate
repositories), `application/ports/out`, `application/use-cases`, `infrastructure` and `presentation`.
A module that is still small stays shallow. Test cases, topics,
tags, starter code and supported languages belong to Problems. Chapters stay with Courses. Class
and Enrollment move to their own `enrollments` module: the join code, the enrolment lifecycle and
the class-size limit are behaviour of their own and no longer depend on the Course lifecycle.

Creating the four layers for a module that has no invariants is prohibited, exactly as under
ADR 0001.

## Dependency direction

```text
presentation -> application -> domain
infrastructure ----implements----^ application/domain ports
```

- Domain imports no NestJS, TypeORM, RabbitMQ, Redis, HTTP or JWT code. It is testable with plain
  constructor calls.
- Application depends only on domain types (including domain repository ports) and its own out ports.
- REST controllers and message consumers are both driving adapters. They call one use case and
  translate its result; they do not implement multi-step workflows.
- TypeORM repositories, internal REST responses and RabbitMQ publishing are driven adapters bound at
  the module composition root.

Relations between Learning-owned tables are valid. References to Identity or Submission are plain
external IDs and never cross-database TypeORM relations.

## Ports

Two kinds of boundary exist inside the hexagon:

- **Driven port** — a port reached by the core, implemented by an infrastructure adapter. Aggregate
  repository ports (e.g. `ProblemRepository`) are declared in `domain/repositories/`; other driven
  ports (e.g. `CourseStructureReader`, `TransactionRunner`, `PrincipalProvider`) are declared in
  `application/ports/out/`. All driven ports are implemented in `infrastructure/`. Port files use
  `<name>.port.out.ts`; inbound port interfaces use `<name>.port.in.ts` under
  `application/ports/in/`, and controllers inject them through `<NAME>_PORT_IN` tokens. Never
  `<name>.port.ts`.
- **Internal boundary** — a rule or service used only inside the core, with no infrastructure adapter.
  Pure domain rules (e.g. `PublishValidator`, `DifficultyLadder`) live in `domain/services/`;
  application-only services (e.g. Problem authorization) live in `application/services/`. Both keep
  use cases free of framework and infrastructure details.

### When to create a port

Introduce a port only when it isolates a real business boundary, enables a meaningful test seam, or
supports a second implementation. Do not create a port for every table (repository per table is
prohibited), and do not add empty layers for diagram symmetry.

### Cross-module reads

Learning is one bounded context in one database (`bkpractice_learning`). A module may read tables
owned by another Learning module, but only through **its own read port** (e.g.
`CourseStructureReader`, `ClassMembershipReader`, `AssignmentReader`, `RecommendationCandidateReader`).

Rules:

- Do not import another module's entity, repository or datasource.
- Do not call another module's write repository.
- If the owning module exports a read query (a projection), prefer calling that query instead of
  re-implementing the same visibility rules.
- No cross-database TypeORM relations; `lecturer_id`, `student_id`, `user_id` are plain external IDs.

### Ports shared between modules

`PrincipalProvider` and `TransactionRunner` (LRN-001) are shared ports. Import them from the module
that owns them; do not copy them and do not move them into `libs/`. Avoid creating a generic shared
Learning service.

## Current implementation and status

The service correctly owns all 13 current Learning entities, migrations and `bkpractice_learning`
(as of 2026-10-21). Problems, Courses, Assignments and Progress remain in the same service; the
accepted-submission event updates Progress without querying Submission's database. Hidden judge data
is exposed only through a protected internal endpoint.

Status: **PARTIALLY ALIGNED**. Domain grouping exists, but `ProblemsController` directly queries
TypeORM and constructs the judge package, while `ProgressConsumer` directly applies persistence
updates. TypeORM entities currently combine persistence and domain representation, so no aggregate
or value object exists yet.

## Incremental alignment

- Extract `ListPublishedProblems`, `BuildJudgePackage` and `ApplyAcceptedSubmission` use cases as
  part of LRN-001, LRN-002 and LRN-006 respectively; implement these before introducing new flows.
- Introduce the Problem aggregate, its value objects and its publish validator as part of LRN-001;
  write those tests without a database.
- Put repository and message implementations behind focused driven ports (see Ports above).
- Keep the TypeORM entity as the persistence model and map it to the domain object at the
  infrastructure boundary. Do not move either into `libs/`.
- Add modules for Enrollment (LRN-004), Progress (LRN-006) and Recommendation (LRN-007) only with
  real behavior; do not create empty folders.
- Keep internal cross-module interaction explicit via read ports; avoid a generic shared Learning
  service.

## References

- [ADR 0002: Revised Service Internal Architectures](../adr/0002-revised-service-internal-architectures.md)
- [ADR 0001: Service-specific Internal Architectures](../adr/0001-service-specific-internal-architectures.md)
- [Dependency Rules](../architecture/dependency-rules.md)
- [Service Architecture Matrix](../architecture/service-architectures.md)
- [System Architecture](../architecture/system-architecture.md)
