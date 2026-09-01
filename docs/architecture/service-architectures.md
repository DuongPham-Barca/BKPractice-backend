# Service Architecture Matrix

BKPractice deliberately uses a common engineering baseline with workload-specific internal
architectures. Consistency means common naming, configuration, validation, observability and
dependency rules; it does not mean forcing every application into the same folder tree.

| Application | Selected internal architecture                                | Why                                                                                                                                                   | Current alignment     |
| ----------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| API Gateway | Gateway Pattern + lightweight Layered Architecture            | It is an edge adapter dominated by authentication, routing and transport concerns; domain/repository layers would add no value.                       | **ALIGNED**           |
| Identity    | Clean Architecture + domain-oriented feature modules          | Authentication and RBAC have security-sensitive rules that benefit from isolated use cases, domain policy and replaceable persistence/token adapters. | **PARTIALLY ALIGNED** |
| Learning    | Clean Architecture + Modular Domain Architecture              | It contains several related subdomains that must evolve independently without being split into unnecessary services.                                  | **PARTIALLY ALIGNED** |
| Submission  | Clean Architecture + Event-Driven Architecture                | It coordinates a durable lifecycle across REST, PostgreSQL, RabbitMQ, Redis and realtime delivery without executing code itself.                      | **PARTIALLY ALIGNED** |
| Judge       | Worker Architecture + Pipeline Architecture + Adapter Pattern | It is a stateless asynchronous compute engine, not a CRUD application. Pipeline stages and adapters fit language/sandbox variation.                   | **PARTIALLY ALIGNED** |
| Community   | Clean Architecture + Modular Domain Architecture              | Social behavior is domain-oriented and naturally divided into posts, comments, reactions, bookmarks and moderation.                                   | **PARTIALLY ALIGNED** |

## Organization decision

Clean Architecture services use **feature-first grouping**. A meaningful feature grows internal
`domain`, `application`, `infrastructure` and `presentation` folders only when it has enough code to
justify them:

```text
modules/<feature>/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

Small modules may keep a shallow NestJS structure. Empty layers, placeholder use cases and
one-method interfaces created only for diagram symmetry are prohibited.

Judge evolves around its execution flow rather than Clean Architecture layer names:

```text
worker -> orchestrator -> pipeline -> ports -> language/sandbox adapters
```

## Current-state interpretation

The current foundation has correct service and data boundaries. Most business services use a
shallow NestJS feature-module layout where services directly depend on TypeORM or transport SDKs.
That is acceptable for the present foundation, but it is not the final Clean Architecture
dependency direction. New non-trivial workflows should introduce application use cases and ports
inside their owning feature; existing working code should be migrated incrementally when it is
touched, not moved in a repository-wide rewrite.
