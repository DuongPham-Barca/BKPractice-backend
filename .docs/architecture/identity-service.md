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

modules/users/infrastructure/persistence/user.entity.ts
modules/profiles/infrastructure/persistence/profile.entity.ts
modules/rbac/infrastructure/persistence/{role,permission}.entity.ts
modules/auth/infrastructure/persistence/{refresh-token,auth-session,external-identity}.entity.ts
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

Identity owns User, Profile, RefreshToken, Role and Permission entities and `bkpractice_identity`.
Their TypeORM models live in the owning feature's infrastructure; `identity.entities.ts` registers
them for the Identity datasource. `User` remains the shared account model in `users`, while Profile
owns the one-way relation to it. Controllers are thin and roles are not services.

Status: **PARTIALLY ALIGNED**. Auth, Profile and RBAC use application use cases and infrastructure
adapters, but Auth and Profile adapters still read the shared User persistence model directly.
That cross-feature persistence use should be reviewed as account-management behavior is added.

## Incremental alignment

- Keep authentication, profile and RBAC workflows in their application use cases and concrete
  persistence/security code in infrastructure adapters.
- Add account-management behavior only after its own spec and plan are Approved; review whether
  the shared User persistence access needs a dedicated application port then.
- Keep persistence models separate from domain behavior where that behavior exists; do not add
  anemic domain duplicates for TypeORM records.
- Keep migrations and datasource under Identity infrastructure/database ownership.
