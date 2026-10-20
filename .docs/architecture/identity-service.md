# Identity Service Architecture

## Selected style

Identity uses **Clean Architecture**, as decided in
[ADR 0002](../adr/0002-revised-service-internal-architectures.md). The chosen growth model is
feature-first:

```text
modules/auth/
├── domain/          authentication and token policy
├── application/     register, login, refresh, logout use cases
├── infrastructure/  TypeORM, Argon2 and JWT adapters
└── presentation/    REST controllers and DTOs

modules/users/
modules/profiles/
modules/rbac/
```

Only create a layer inside a feature when real behavior exists there. Cross-feature orchestration
belongs in application use cases, not controllers.

## Dependency direction

```text
presentation -> application -> domain
infrastructure --------implements--------^ ports
```

The domain owns account status, roles, permissions and security policy. It must not import NestJS
controllers, TypeORM repositories, HTTP details, RabbitMQ or concrete JWT/password libraries.
Application ports describe persistence, password hashing, token issuance and transaction needs.
Infrastructure implements those ports with TypeORM, Argon2 and Nest JWT.

## Current implementation and status

The database and service boundary are correct: Identity owns User, Profile, RefreshToken, Role and
Permission entities and `bkpractice_identity`. Controllers are thin and roles are not services.

Status: **PARTIALLY ALIGNED**. `AuthService` currently combines application workflow with direct
TypeORM, transaction, Argon2, JWT and configuration access. The TypeORM-decorated classes also act
as the current domain model. This is a pragmatic foundation, but the inner domain is not yet
framework-independent.

## Incremental alignment

- When authentication workflows expand, extract one application use case per meaningful workflow
  and define only the ports it actually requires.
- Move JWT, hashing and TypeORM code behind adapters while preserving API behavior and schema.
- Separate persistence models from domain objects only when domain behavior makes the distinction
  useful; do not duplicate anemic objects preemptively.
- Keep migrations and datasource under Identity infrastructure/database ownership.
