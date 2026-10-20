# Service Architecture Matrix

BKPractice deliberately uses a common engineering baseline with workload-specific internal
architectures. Consistency means common naming, configuration, validation, observability and
dependency rules; it does not mean forcing every application into the same folder tree.

The authoritative decision is [ADR 0002](../adr/0002-revised-service-internal-architectures.md),
which supersedes ADR 0001.

| Application | Selected internal architecture                       | Why                                                                                                                                                               | Current alignment     |
| ----------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| API Gateway | Layered Architecture                                 | It is an edge component dominated by authentication, routing and transport concerns; domain/repository layers would add no value.                                 | **ALIGNED**           |
| Identity    | Clean Architecture                                   | Authentication and RBAC have security-sensitive rules that benefit from isolated use cases, domain policy and replaceable persistence/token adapters.             | **PARTIALLY ALIGNED** |
| Learning    | DDD + Hexagonal Architecture                         | The model itself is the hard part: real aggregates, lifecycle invariants and a genuine ubiquitous language. Hexagonal keeps that model free of framework details. | **PARTIALLY ALIGNED** |
| Submission  | Clean Architecture + Event-Driven Architecture       | It coordinates a durable lifecycle across REST, PostgreSQL, RabbitMQ, Redis and realtime delivery without executing code itself.                                  | **PARTIALLY ALIGNED** |
| Judge       | Hexagonal Architecture (Ports & Adapters) + Pipeline | It is a stateless asynchronous compute engine with interchangeable language runners and sandbox backends, not a CRUD application.                                 | **PARTIALLY ALIGNED** |
| Community   | Clean Architecture                                   | Social behavior is domain-oriented and grows naturally into posts, comments, reactions, bookmarks and moderation.                                                 | **PARTIALLY ALIGNED** |

## Organization decision

Clean Architecture and Hexagonal services use **feature-first grouping**. A meaningful feature grows
internal `domain`, `application`, `infrastructure` and `presentation` folders only when it has
enough code to justify them:

```text
modules/<feature>/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

Small modules may keep a shallow NestJS structure. Empty layers, placeholder use cases and
one-method interfaces created only for diagram symmetry are prohibited.

### Where the labels differ in practice

- **Clean Architecture** (Identity, Community, Submission) emphasises isolating business rules from
  framework and infrastructure churn. The folder layout above is the visible outcome.
- **Hexagonal Architecture** (Learning, Judge) emphasises the port/adapter boundary: the core is
  reached only through driving ports and reaches the outside only through driven ports. In practice
  its dependency direction is the same as Clean Architecture; the label signals that interchangeable
  adapters are a first-class concern.
- **DDD** (Learning only) is an addition about _modelling_, not about folders. It is used
  tactically — aggregate root, value object, domain service, repository — inside the single Learning
  bounded context. Strategic DDD (context mapping, anti-corruption layers, multiple bounded
  contexts) is out of scope.
- **Event-Driven** (Submission only) describes how the service communicates, not where its logic
  lives. It is paired with Clean Architecture for that reason.

Judge organizes around its execution flow rather than Clean Architecture layer names:

```text
consumer (driving adapter) -> orchestrator -> pipeline -> driven ports -> language/sandbox adapters
```

## Current-state interpretation

The current foundation has correct service and data boundaries. Most business services use a
shallow NestJS feature-module layout where services directly depend on TypeORM or transport SDKs.
That is acceptable for the present foundation, but it is not the final dependency direction. New
non-trivial workflows should introduce application use cases and ports inside their owning feature;
existing working code should be migrated incrementally when it is touched, not moved in a
repository-wide rewrite.

Renaming a target architecture in ADR 0002 did not change any application's alignment status. An
application is aligned when its dependency direction and responsibilities match its target, not when
its folder names match a diagram.
