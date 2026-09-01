# Dependency Rules

These rules are the architectural contract for new code and incremental refactors.

## Clean Architecture services

Identity, Learning, Submission and Community follow:

```text
presentation -> application -> domain
infrastructure ----implements----^ application/domain ports
```

| Layer            | May depend on                                           | Must not depend on                                                                        |
| ---------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Domain           | Domain types and language/runtime standard library      | NestJS controllers/modules, TypeORM, RabbitMQ, Redis, Axios, concrete JWT/Docker adapters |
| Application      | Domain and its own ports/contracts                      | Concrete TypeORM repositories, transport SDKs, Express/Socket.IO response objects         |
| Infrastructure   | Application/domain ports, technical libraries           | Presentation controllers; infrastructure from another service                             |
| Presentation     | Application use cases, request/response DTOs            | Direct database queries or complex business workflows                                     |
| Composition root | All local layers needed for dependency injection wiring | Business behavior                                                                         |

Framework decorators on request DTOs are presentation concerns. TypeORM-decorated entities are
persistence models. The current foundation sometimes combines persistence and domain models; this
is a documented transitional state, not a pattern to spread into complex new workflows.

## Controllers and consumers

- Controllers validate/translate input, invoke one application operation and translate output.
- RabbitMQ consumers deserialize, invoke an application operation and manage adapter-level
  delivery behavior.
- Controllers/consumers must not implement multi-step domain transactions directly.
- Application use cases coordinate transactions and outbound ports.

## Repository and adapter rules

- Repository interfaces are introduced for actual application seams, not for every table by
  default.
- Repository implementations and TypeORM query builders belong to infrastructure.
- HTTP, JWT, Argon2, RabbitMQ, Redis, Socket.IO and Docker implementations are adapters.
- A service may bind a concrete adapter in its Nest module/composition root.
- No service imports another service's source code, entity, repository, datasource or migration.

## Judge rules

Judge follows a worker dependency flow:

```text
consumer -> orchestrator -> pipeline -> ports <- adapters
```

- The consumer remains thin and knows RabbitMQ delivery concerns.
- The orchestrator owns stage order but not Docker process details.
- Pipeline evaluation depends on LanguageRunner/Sandbox-like ports where that seam is practical.
- Language and Docker adapters own trusted commands and runtime integration.
- Judge core must not accept arbitrary compiler, filename, Docker or shell arguments from clients.
- Judge remains stateless unless a separately approved requirement justifies persistence.

## Gateway rules

- Gateway code may depend directly on HTTP, JWT, rate-limit, Redis and Socket.IO libraries.
- Gateway must not have domain/repository layers, business entities or a business database.
- Coarse authentication/route metadata is allowed; stateful domain authorization belongs to the
  owning service.

## Shared library rules

Allowed in `libs/`:

- transport/message contracts and topology names;
- configuration and validation helpers;
- correlation IDs, health, logging and generic technical utilities;
- context-neutral output/error helpers.

Prohibited in `libs/`:

- User, Problem, Submission, Post or other service-owned business entities;
- repositories tied to a bounded context;
- shared database access that bypasses service ownership;
- business use cases reused by importing another service's internals.

## Pragmatic enforcement

Avoid abstraction for abstraction's sake. A shallow module is valid while it is small. Introduce a
port when it isolates a real business boundary, enables a meaningful test seam, or supports a
second implementation. Architectural alignment should happen feature-by-feature with behavior and
schema preserved, not through a repository-wide folder shuffle.
