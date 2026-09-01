# ID-003 RBAC Implementation Plan

## Status

Approved

Approved by the human product owner on `2026-09-01`.

This plan is based on the Approved ID-003 specification revision `0.3`. It is a design artifact
for implementation tasks; it does not implement RBAC or change the specification.

## Related Specification

- [ID-003 Role-Based Access Control](./spec.md)
- Status: `Approved`
- Approved revision: `0.3`
- Approval date: `2026-09-01`

The specification remains the source of truth for the three-role vocabulary, multi-role behavior,
role-management policy, administrator protection, privacy/security requirements and exclusions.
This plan does not add a role, permission catalog, endpoint requirement or IAM capability.

## Target Service

Service: Identity Service

RBAC state and policy remain in `bkpractice_identity`. Public role-management requests reach
Identity through the API Gateway. Learning, Submission and Community remain responsible for their
own action/resource/ownership checks and do not receive a repository or database dependency on
Identity.

The existing Gateway already forwards `/api/roles` to Identity and protects non-public `/api`
routes. The plan adds only the Identity-side RBAC boundary and any narrow trusted-principal
contract adjustment required by the approved authentication design.

## Required Service Architecture

Architecture: **Clean Architecture + domain-oriented feature modules**.

RBAC follows the Identity dependency direction:

```text
presentation -> application -> domain
infrastructure ----implements----^ ports
```

The feature is organized incrementally under the existing
`apps/identity-service/src/modules/rbac/` area. Layers are introduced because role assignment,
permission evaluation and last-administrator protection are real behavior; no repository-wide
folder rewrite or empty abstraction layer is planned.

## Existing Code Impact

### Current foundation

- `apps/identity-service/src/modules/rbac/entities/role.entity.ts` already defines the
  `STUDENT`, `LECTURER` and `ADMIN` enum and the eager Role-to-Permission relation.
- `apps/identity-service/src/modules/rbac/entities/permission.entity.ts` already defines a unique
  permission-code column.
- `apps/identity-service/src/modules/users/entities/user.entity.ts` already provides a User-to-Role
  many-to-many relation using `user_roles`; its composite primary key prevents duplicate
  assignments.
- `apps/identity-service/src/modules/identity.entities.ts` and
  `apps/identity-service/src/database/data-source.ts` already register the RBAC persistence
  models in Identity only.
- `apps/identity-service/src/database/migrations/1700000000000-InitialIdentitySchema.ts` already
  seeds the three static roles and creates `user_roles` and `role_permissions` with local foreign
  keys and composite uniqueness.
- `apps/identity-service/src/modules/auth/auth.service.ts` currently loads roles for token claims;
  ID-003 must reuse that ID-001 token contract and must not create a second token issuer.
- `apps/identity-service/src/identity-service.module.ts` imports `AuthModule` but no RBAC feature
  module. There is no RBAC controller, guard, application use case, repository port or focused
  test suite.
- `apps/api-gateway/src/auth/gateway-auth.middleware.ts` verifies BKPractice access tokens,
  removes caller-supplied `x-auth-user-id`/`x-auth-roles`, and forwards trusted values from verified
  claims. `/api/roles` is already routed by `gateway-proxy.service.ts`.
- The global bootstrap already provides validation, whitelist/unknown-field rejection and Swagger
  conventions.

### Change classification

| Classification | Planned treatment                                                                                                                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUSE          | Existing Role/Permission/User persistence models, `user_roles` and `role_permissions` schema, Identity datasource/entity registry, ID-001 token/authentication context, Gateway header sanitization and `/api/roles` routing, common validation/error/Swagger bootstrap |
| MODIFY         | `role.entity.ts` only as needed to reference a framework-independent canonical role definition; `identity-service.module.ts` for RBAC composition; existing auth/principal adapter only if a compatible ID-001 context port is not exposed                              |
| CREATE         | RBAC domain policies/types, application ports and use cases, TypeORM role-assignment adapter, trusted-principal guard/decorator integration, RBAC controller/DTOs, module wiring, technical authorization contract if absent, and focused tests                         |
| REMOVE         | None. Authentication, Profile and existing role persistence behavior are not removed by this plan.                                                                                                                                                                      |

The current shallow TypeORM entities remain persistence models during this incremental alignment.
They are not copied into `libs/` and are not replaced with a repository-wide clean-architecture
rewrite.

## Domain Changes

### Canonical role and permission concepts

- Reuse the existing `STUDENT`, `LECTURER` and `ADMIN` vocabulary as a framework-independent
  domain type. If the current enum remains in the persistence file, introduce a small domain
  definition and map the TypeORM enum to it; do not create divergent role enums in other services.
- Represent permission identifiers as stable `resource:action` values. A small parser/value type
  may reject malformed identifiers, but ID-003 does not seed a complete future-feature catalog.
- Use an `AuthorizationPrincipal` value/contract containing the verified local `userId`, trusted
  role snapshot and account-status context needed by the authorization boundary. It must not
  contain passwords, refresh credentials, provider tokens or caller-supplied role data.
- Use an `AuthorizationDecision` result with allow/deny and a safe reason category. It is not an
  HTTP response type and does not expose internal permission tables.

### Domain policies and invariants

Create only the policy behavior required by the Approved specification:

- `STUDENT`, `LECTURER` and `ADMIN` are static predefined roles; no runtime role creation,
  deletion or custom roles.
- A User may hold multiple roles. Effective capabilities are the union of permissions explicitly
  mapped to those roles; no role gains implicit capabilities.
- Missing, unknown or ambiguous policy is default-deny.
- `ADMIN` is the only actor allowed to invoke role-management operations.
- Cross-user assignment/revocation targets only `STUDENT` or `LECTURER`. Granting `ADMIN` to another
  User is always rejected.
- An Admin may relinquish their own `ADMIN` role only when another Admin remains. The final Admin
  cannot be removed. This check is a domain invariant and must also be protected transactionally
  by persistence.
- Assigning an existing role and revoking an absent role are idempotent success operations.
- Account status is not redefined by RBAC. `LOCKED`/`PENDING` behavior remains governed by ID-001;
  RBAC cannot reactivate or bypass it.
- Profile and Authentication inputs cannot mutate role or permission state.
- Resource ownership and feature-specific rules remain in the owning service; a broad role never
  replaces those checks.

The domain layer imports no NestJS, TypeORM, JWT, Gateway, HTTP or database implementation.

## Application / Use Cases

Implement only the operations required by the Approved specification. Names are conceptual and
must follow the repository convention during implementation.

### `GetUserRoles`

- **Actor:** authenticated `ADMIN`.
- **Input:** target `userId` from the route; actor identity/roles from the trusted principal.
- **Flow:** authorize the actor, load the target User's current role assignments through a port,
  and map to a safe role list.
- **Output:** target `userId` and predefined role names only; no password, token, permission-table
  internals or account secrets.
- **Errors:** unauthenticated, forbidden non-Admin, or target not found using existing conventions.

### `AssignRoleToUser`

- **Actor:** authenticated `ADMIN`.
- **Input:** target `userId` and one role value, limited to `STUDENT` or `LECTURER`. The request
  must not carry `actorId`, actor role, permission, account-status or token claims.
- **Flow:** authorize the actor, validate the target and role, apply the no-`ADMIN`-grant policy,
  and insert the assignment idempotently in an Identity transaction.
- **Output:** safe resulting role assignment state.
- **Errors:** invalid role, target not found, forbidden actor, or policy violation. An existing
  assignment returns success without creating a duplicate.

### `RevokeRoleFromUser`

- **Actor:** authenticated `ADMIN`.
- **Input:** target `userId` and role. Cross-user operations may revoke `STUDENT` or `LECTURER`.
  An Admin self-revocation of `ADMIN` is the single controlled exception.
- **Flow:** authorize the actor, lock the administrator continuity check, enforce the final-Admin
  invariant, and remove the assignment idempotently.
- **Output:** safe resulting role assignment state.
- **Errors:** forbidden non-Admin, protected-last-Admin violation, invalid role, or target not
  found. Revoking an absent `STUDENT`/`LECTURER` is successful and makes no unrelated change.

### `EvaluateAuthorization` (internal application operation)

- **Purpose:** provide one domain/application seam for evaluating a trusted principal against a
  required permission and feature policy where Identity itself owns the decision.
- **Input:** verified principal, required stable permission identifier, and optional feature-owned
  ownership/resource result.
- **Output:** allow/deny decision with a safe category.
- **Boundary:** this is not a public `/authorize` endpoint and does not become a remote decision
  service for every request. Downstream services consume the trusted principal contract and enforce
  their own resource policy; a future feature plan may add an approved internal REST check only if
  its behavior requires current Identity-side permission lookup.

### Application ports

Introduce only real seams:

| Port                             | Responsibility                                                                                                          | Adapter                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `RbacRepository`                 | Read target roles/effective permissions; idempotently assign/revoke roles; count Admins; execute protected role changes | TypeORM adapter in Identity infrastructure           |
| `IdentityAccountContext`         | Reuse ID-001's verified principal/account-status context and target-user existence data                                 | Existing ID-001 context or a narrow Identity adapter |
| `TransactionRunner`              | Coordinate the last-Admin check and role mutation atomically                                                            | TypeORM `DataSource` adapter                         |
| `AuthorizationPrincipalProvider` | Translate the trusted Gateway/ID-001 context into a framework-independent principal                                     | Identity-side guard/context adapter                  |

Do not add a generic repository base class, CQRS bus, policy engine, event store or separate role
service.

## Persistence

All RBAC persistence remains in `bkpractice_identity`.

- Reuse `roles`, `permissions`, `user_roles` and `role_permissions` through a dedicated
  `RbacRepository` adapter. No other service datasource or entity is imported.
- Preserve the existing unique role name and permission code constraints. The composite primary
  keys on `user_roles` and `role_permissions` enforce no duplicate assignment/mapping.
- Use explicit queries/updates rather than spreading request objects into TypeORM entities.
- Role assignment uses `INSERT ... ON CONFLICT DO NOTHING` (or the repository's equivalent) for
  idempotent success. Revoke uses a conditional delete and returns the resulting state.
- The last-Admin check and Admin self-revocation are performed in one transaction. Lock the
  relevant Admin role/assignment rows or use an equivalent database-safe serialization strategy so
  concurrent revocations cannot leave the database without an Admin.
- Effective permission evaluation reads Identity-owned role-permission mappings. An unassigned
  permission cannot authorize a User. No full future-feature permission catalog is invented here.
- Existing imported students receive `STUDENT` through the trusted provisioning workflow described
  by ID-001; RBAC does not parse Excel or create accounts.
- Role changes do not rewrite existing access tokens. ID-001 controls token issuance and expiry;
  new tokens reflect current role state.

## Database Changes

No schema change is required for the approved ID-003 v1 behavior. The existing baseline already
provides:

- static role enum values `STUDENT`, `LECTURER`, `ADMIN`;
- unique role names and permission codes;
- many-to-many `user_roles` and `role_permissions` relations;
- composite uniqueness preventing duplicate assignments; and
- local Identity foreign keys only.

The implementation must not add a role, role-permission table in another service, cross-service
foreign key, role-history table or device/session data. Static permission rows for concrete
Learning/Submission/Community actions are introduced only by their separately approved feature
plans. If inspection discovers missing constraints that make the Approved invariant impossible,
stop and report the schema conflict instead of silently changing it.

## Migration

N/A for the planned v1 implementation. Do not edit
`apps/identity-service/src/database/migrations/1700000000000-InitialIdentitySchema.ts` and do not
create a no-op migration merely to represent the plan.

During implementation, verify that the existing Identity migration applies with
`synchronize: false`, seeds the three roles, and preserves the `user_roles`/`role_permissions`
constraints. Any required schema correction must be a separately reviewed Identity migration and
must not be introduced implicitly by RBAC code.

## API

The Gateway already routes `/api/roles` to Identity. The following REST operations provide the
approved role-management scope without exposing a generic authorization endpoint:

| Operation                               | Authentication                                    | Application operation | Response/behavior                                                                   |
| --------------------------------------- | ------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| `GET /api/roles/users/:userId`          | Valid BKPractice Bearer token + `ADMIN` principal | `GetUserRoles`        | `200` with target `userId` and safe role names                                      |
| `POST /api/roles/users/:userId`         | Valid Bearer token + `ADMIN` principal            | `AssignRoleToUser`    | `200` with resulting assignment; body role is only `STUDENT` or `LECTURER`          |
| `DELETE /api/roles/users/:userId/:role` | Valid Bearer token + `ADMIN` principal            | `RevokeRoleFromUser`  | `200` with resulting assignment; absent Student/Lecturer role is idempotent success |

`ADMIN` is not an assignable target role. The delete operation may represent the approved Admin
self-revocation exception only when the application invariant confirms another Admin remains; it
never permits removal of the final Admin. No `POST /api/roles`, role CRUD, permission CRUD or
public `/authorize` route is planned.

The controller only parses transport input, invokes one use case and maps the existing Identity/
Gateway errors. Actor identity is taken from the trusted authentication context, never from the
request body, path or query string.

## DTO / Validation

- `AssignRoleRequestDto` contains only a required role value. Transport validation accepts the
  predefined enum values and rejects unknown roles/extra fields through the global whitelist and
  `forbidNonWhitelisted` pipe.
- A route parameter validation/mapping layer converts `:role` to the canonical domain role type;
  malformed values fail before state changes.
- `UserRolesResponseDto` and role-operation response DTOs expose only stable user/role assignment
  data. They do not expose permission-table internals, password/hash, tokens, provider data or
  account secrets.
- No DTO accepts `actorId`, `actorRole`, `permissions`, `accountStatus`, `passwordHash` or trusted
  identity headers.
- Transport validation handles shape and enum membership. Domain/application policy handles
  Admin-only authorization, prohibited Admin grants, last-Admin protection and idempotency.

## Authorization

- Role-management operations require a verified ID-001 principal with the `ADMIN` role and an
  account state permitted by ID-001. Student and Lecturer callers receive the existing forbidden
  behavior.
- The Gateway verifies the Bearer token and strips caller identity headers. Identity adds a thin
  defense-in-depth principal guard/context adapter for direct or misrouted calls; it reuses ID-001
  token verification and does not create a second authentication system.
- The actor is always derived from the verified principal. Client-supplied `userId`, role, or
  permission fields cannot alter the authorization decision.
- `ADMIN` may inspect roles and assign/revoke predefined `STUDENT`/`LECTURER` roles. Granting
  `ADMIN` to another User is denied. Admin self-revocation is allowed only when another Admin
  remains; the final Admin is protected.
- `Profile` and `Authentication` flows remain unable to mutate RBAC state. ID-002's Admin profile
  operations do not become role-management operations.
- Learning, Submission and Community enforce action/resource/ownership rules at their own trusted
  boundaries. They consume only approved principal/role transport context and never query
  `bkpractice_identity` directly.

## Messaging / Events

N/A. ID-003 has no approved asynchronous business event. Role changes are synchronous Identity
transactions. Do not add RabbitMQ events merely to announce role mutations.

## Realtime

N/A. RBAC has no Socket.IO or Redis realtime requirement. Access-token role snapshots follow the
ID-001 expiration policy; no distributed access-token blacklist or cache invalidation system is
introduced.

## Infrastructure Adapters

### TypeORM RBAC adapter

Implement `RbacRepository` under the RBAC infrastructure module. It owns query builders,
transaction details, role/permission mapping and idempotent assignment behavior. It uses only the
Identity datasource and existing Identity entities.

### Principal/authentication adapter

Reuse the ID-001 access-token verifier/principal contract when available. The adapter may validate
the Bearer token or the Gateway-generated trusted context for defense in depth, but it must reject
client-supplied `x-auth-user-id`/`x-auth-roles` values and never accept a Microsoft provider token
as a BKPractice principal.

### Static catalog adapter

Read the existing static role enum and permission relation. Do not add runtime role/permission CRUD,
custom role builders or a policy engine. Feature-specific permission definitions remain owned by
Identity but are added only through their approved feature plans.

### Technical shared contract

If ID-001 has not already created a compatible transport contract, add a small
`libs/contracts/src/authorization.contracts.ts` containing only the trusted principal shape and
stable role/permission identifier types needed across service boundaries. Do not place Role,
Permission, User or repository classes there. Export it from `libs/contracts/src/index.ts` only if
the existing contract convention requires it.

## Error Handling

Reuse the existing NestJS validation and Gateway error normalization. Domain/application errors
remain framework-independent and are mapped by Presentation:

| Condition                                                          | Expected mapping                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Missing/invalid access token                                       | Existing `401` authentication convention                                                    |
| Authenticated Student/Lecturer or otherwise insufficient principal | Existing `403` forbidden convention                                                         |
| Unknown role or malformed route/body                               | Existing `400` validation convention; no state change                                       |
| Attempt to grant `ADMIN` to another User                           | `403` policy violation (or the existing equivalent business-error mapping); no state change |
| Target User not found                                              | Existing Identity `404` convention; no state change                                         |
| Operation would remove the last Admin                              | Existing conflict/business-rule convention (normally `409`); no state change                |
| Existing assignment or absent Student/Lecturer revoke              | Idempotent success; no duplicate/unrelated mutation                                         |
| Missing/spoofed trusted context                                    | Fail closed through the existing `401`/`403` boundary                                       |
| Persistence or transaction failure                                 | Existing normalized server error with request ID; never expose SQL/policy internals         |

No new error envelope is introduced. Logs use request/correlation IDs and coarse outcomes only;
they do not include tokens, credentials, raw authorization headers or full permission internals.

## Security

| Requirement    | Planned enforcement                                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID-003-SR-001  | Domain/application role-assignment policy rejects self-escalation; only Admin workflow may change roles; Admin self-revoke is constrained by last-Admin invariant |
| ID-003-SR-002  | Gateway strips spoofed headers; DTOs reject trusted fields; principal adapter uses verified ID-001 context only                                                   |
| ID-003-SR-003  | Identity controller/use cases and each owning business service enforce authorization server-side; UI visibility is irrelevant                                     |
| ID-003-SR-004  | Authorization evaluator uses explicit role/permission matches and default-deny for missing/unknown policy                                                         |
| ID-003-SR-005  | Only Identity `RbacRepository` and Admin-authorized use cases mutate assignments; Profile/other services have no write path                                       |
| ID-003-SR-005a | Application policy rejects granting Admin to another User and transactionally protects the last Admin                                                             |
| ID-003-SR-006  | Role policy keeps Lecturer distinct from Admin and never makes Admin an implicit ownership/validation bypass                                                      |
| ID-003-SR-007  | ID-001 token type/status/snapshot semantics are reused; provider and refresh tokens are not RBAC credentials                                                      |
| ID-003-SR-008  | All persistence stays in `bkpractice_identity`; no cross-service SQL, TypeORM relation or business entity sharing                                                 |
| ID-003-SR-009  | Safe response DTOs and redacted logs omit passwords, token material, provider credentials and unnecessary policy data                                             |
| ID-003-SR-010  | Invalid/unavailable principal or policy context fails closed; no client-role or implicit-Admin fallback                                                           |

No Keycloak, OAuth provider, MFA, ABAC/ReBAC engine, Redis authorization blacklist or audit
microservice is introduced.

## Testing Strategy

### Unit tests

- Canonical role validation accepts only `STUDENT`, `LECTURER`, `ADMIN`; malformed permission
  identifiers are rejected.
- Multi-role evaluation returns the union of explicitly mapped permissions and default-denies
  missing/unknown policy.
- Student and Lecturer role-management attempts are forbidden.
- Admin can inspect and assign/revoke Student/Lecturer; Admin grant-to-Admin is forbidden.
- Admin self-revocation succeeds only when another Admin remains; final-Admin removal is rejected.
- Existing assignment and absent Student/Lecturer revoke are idempotent and do not create unrelated
  changes.
- Account-status and token-snapshot decisions defer to ID-001 and never create an alternate path.
- Role/permission/account-status fields supplied through Profile/Auth-shaped input cannot mutate
  RBAC policy.

### Persistence/integration tests

- Existing Identity migration creates static roles, role relations and composite uniqueness with
  `synchronize: false`.
- Role assignment/revocation uses only Identity tables and keeps duplicate rows impossible.
- Concurrent final-Admin revocation attempts serialize safely; at least one Admin remains.
- Role-permission joins resolve only explicitly assigned capabilities.
- Target-user not-found and transaction rollback leave assignment state unchanged.
- No cross-service datasource, foreign key or shared business entity is imported.

### API/Gateway tests

- `GET/POST/DELETE /api/roles/...` work through Gateway for a trusted Admin principal.
- Missing/invalid token returns `401`; Student/Lecturer or insufficient context returns `403`.
- Extra body fields, caller-supplied actor/role headers and path role values cannot escalate access.
- Admin grant of `ADMIN` and final-Admin removal are rejected without persistence changes.
- Idempotent repeated assignment/revocation returns the safe resulting state.
- Responses never include passwords, hashes, tokens, provider credentials or internal permission
  table details.
- A role change is reflected in newly issued ID-001 tokens while an already issued token remains
  unchanged until its approved expiration.

Map tests to the Approved acceptance criteria in the traceability table below. Run the repository's
actual scripts with pnpm after implementation: `pnpm lint`, `pnpm typecheck`, `pnpm test` and
`pnpm build`.

## Observability

- Preserve the existing `x-request-id`/correlation ID through Gateway and Identity.
- Log coarse role-management outcomes (inspect, assign, revoke, deny, last-Admin protection) with
  request ID and, where the existing safe logging policy permits, internal user IDs.
- Never log Authorization headers, raw JWTs, refresh tokens, passwords, provider tokens or complete
  permission tables.
- Add no new metrics, tracing backend, event stream or audit service. If audit becomes required,
  it needs a separately approved feature/plan.

## Requirement Traceability

| Requirement           | Implementation path                                                                           | Primary verification                                       |
| --------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| ID-003-FR-001         | Identity-owned RBAC module/repository; no consumer schema or write adapter                    | Persistence/architecture tests; AC-016                     |
| ID-003-FR-002         | Canonical static role definition and DTO/domain enum validation                               | Unit/API invalid-role tests; AC-014, AC-016                |
| ID-003-FR-003         | Existing User many-to-many relation plus union permission evaluator                           | Domain and persistence tests; AC-006                       |
| ID-003-FR-004         | `EvaluateAuthorization` and `RbacRepository` effective-permission lookup                      | Authorization unit tests; AC-001, AC-006                   |
| ID-003-FR-005         | ID-001 principal adapter and protected RBAC controller/use cases                              | API auth tests; AC-002, AC-003                             |
| ID-003-FR-006         | Server-side guards/use cases and owning-service authorization contract                        | API/security tests; AC-002, AC-005, AC-013                 |
| ID-003-FR-007         | Default-deny policy for missing/ambiguous required permission                                 | Domain tests; AC-004, AC-014                               |
| ID-003-FR-008         | Explicit role-permission matching with no implicit Admin bypass                               | Domain/feature policy tests; AC-001, AC-006, AC-012        |
| ID-003-FR-009         | Admin-only assignment use cases, Profile/Auth write exclusion, static mappings                | Role-management API/security tests; AC-007–AC-009          |
| ID-003-FR-010         | Target-role allowlist and no Admin grant to another User                                      | Application/API tests; AC-008a, AC-008c                    |
| ID-003-FR-010a        | Transactional final-Admin count/lock invariant and self-revoke exception                      | Concurrent integration tests; AC-008b                      |
| ID-003-FR-011         | Gateway-sanitized trusted principal contract and Identity defense in depth                    | Header-spoofing/contract tests; AC-005, AC-013             |
| ID-003-FR-012         | Feature policy remains with Learning/Submission/Community/Profile; no catalog overreach       | Architecture review and boundary tests; AC-013, AC-016     |
| ID-003-FR-013         | Reuse ID-001 account-status/token eligibility policy                                          | Status integration tests; AC-011                           |
| ID-003-FR-014         | Read current roles for new issuance; never mutate existing token                              | ID-001 integration/API tests; AC-010                       |
| ID-003-FR-015         | No role/status/permission fields in Profile/Auth mutation paths                               | Cross-feature security tests; AC-009                       |
| ID-003-FR-016         | RBAC module remains inside Identity; no role service/database                                 | Repository/module inspection; AC-016                       |
| ID-003-SR-001–SR-005a | Domain policy, Admin-only workflow, no Admin grant, last-Admin transaction                    | Security and concurrent API tests; AC-007–AC-008d          |
| ID-003-SR-006–SR-010  | Role separation, ID-001 token semantics, service isolation, redaction and fail-closed context | Unit/API/architecture tests; AC-005, AC-010, AC-013–AC-016 |

## Expected File Changes

### REUSE

- `apps/identity-service/src/modules/rbac/entities/role.entity.ts`
- `apps/identity-service/src/modules/rbac/entities/permission.entity.ts`
- `apps/identity-service/src/modules/users/entities/user.entity.ts`
- `apps/identity-service/src/modules/identity.entities.ts`
- `apps/identity-service/src/database/data-source.ts`
- `apps/identity-service/src/database/migrations/1700000000000-InitialIdentitySchema.ts`
- ID-001 authentication/token principal adapter and existing Gateway authentication middleware
- `apps/api-gateway/src/proxy/gateway-proxy.service.ts` `/api/roles` route
- `libs/common/src/bootstrap.ts` validation, Swagger and error conventions

### MODIFY

- `apps/identity-service/src/modules/rbac/entities/role.entity.ts`: map persistence to the
  canonical domain role definition if needed without changing the approved database enum.
- `apps/identity-service/src/identity-service.module.ts`: import the RBAC module and bind its
  ports/adapters.
- The existing ID-001 principal/auth context only if it lacks a reusable verified principal port;
  preserve its token and status behavior.
- `libs/contracts/src/index.ts` only if a new technical authorization contract is required by the
  existing export convention.

No Gateway route change is expected because `/api/roles` is already forwarded and protected. Any
Gateway edit must remain limited to trusted-context propagation and cannot add business logic.

### CREATE

- `apps/identity-service/src/modules/rbac/rbac.module.ts`
- `apps/identity-service/src/modules/rbac/domain/role-name.ts`
- `apps/identity-service/src/modules/rbac/domain/permission-code.ts`
- `apps/identity-service/src/modules/rbac/domain/authorization-decision.ts`
- `apps/identity-service/src/modules/rbac/domain/role-assignment-policy.ts`
- `apps/identity-service/src/modules/rbac/application/ports/` for the concrete ports above
- `apps/identity-service/src/modules/rbac/application/use-cases/get-user-roles.use-case.ts`
- `apps/identity-service/src/modules/rbac/application/use-cases/assign-role-to-user.use-case.ts`
- `apps/identity-service/src/modules/rbac/application/use-cases/revoke-role-from-user.use-case.ts`
- `apps/identity-service/src/modules/rbac/application/use-cases/evaluate-authorization.use-case.ts`
- `apps/identity-service/src/modules/rbac/infrastructure/persistence/` TypeORM adapter and
  transaction implementation
- `apps/identity-service/src/modules/rbac/infrastructure/auth/` trusted principal adapter/guard
  integration, reusing ID-001 token verification
- `apps/identity-service/src/modules/rbac/presentation/rbac.controller.ts`
- `apps/identity-service/src/modules/rbac/presentation/dto/` request/response DTOs
- `apps/identity-service/src/modules/rbac/presentation/decorators/` only if the existing auth
  context convention has no reusable current-principal decorator
- Focused domain, persistence, API and security tests under the existing repository test
  convention
- `libs/contracts/src/authorization.contracts.ts` only when no compatible ID-001 principal
  contract exists and downstream transport needs the technical shape

### REMOVE

None.

## Implementation Order

1. Reconfirm the Approved spec, Identity architecture, existing RBAC schema and ID-001 principal
   contract; report any conflict before code changes.
2. Add the framework-independent canonical role/permission types and role-assignment/authorization
   policies without importing NestJS or TypeORM.
3. Define the four narrow application ports and use-case boundaries; reuse an ID-001 context port
   instead of creating a duplicate authentication abstraction.
4. Implement and test the TypeORM adapter, idempotent join-table operations and transactional
   last-Admin protection against the existing Identity schema.
5. Add the RBAC module/composition-root wiring and trusted principal guard/context integration.
6. Implement `GetUserRoles`, `AssignRoleToUser`, `RevokeRoleFromUser` and the internal evaluator.
7. Add DTOs, controller routes, error mapping and Swagger metadata; keep the controller transport-
   only.
8. Verify Gateway `/api/roles` forwarding/header sanitization; change Gateway code only if a
   narrow trusted-context compatibility issue is found.
9. Run unit, persistence, concurrency, API and security tests, including role-change token
   snapshot behavior and Profile/Auth mutation exclusion.
10. Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`; review the implementation
    against every FR/SR/AC and the Identity dependency rules.

## Dependencies

- **ID-001 Authentication:** supplies verified identity, account status, access-token role snapshot
  and token issuance/expiry semantics. RBAC does not create another authentication flow.
- **ID-002 Profile:** explicitly forbids Profile from mutating roles, permissions or account status;
  Profile remains a consumer of read-only role representation if needed.
- **API Gateway:** provides the public route, Bearer verification and sanitized trusted context;
  Gateway remains free of RBAC business persistence.
- **Future Learning/Submission/Community specs:** define their own action-level permissions,
  resource ownership and service-side authorization. They consume this foundation but are not
  implemented by ID-003.
- **Operational Admin bootstrap:** an initial Admin must be provisioned by a separately approved
  operational/seed process because ID-003 intentionally provides no public Admin-creation route.
  This is a deployment prerequisite, not a new RBAC API.

## Risks

- **Stale role snapshots:** Existing ID-001 access tokens retain their role snapshot until expiry.
  This is approved behavior; use the configured token lifetime and do not add a blacklist silently.
- **Concurrent final-Admin changes:** A non-transactional count could remove the last Admin. Use a
  database-safe lock/serialization strategy and test concurrent revocations.
- **Admin bootstrap:** Since Admin cannot grant Admin to another User, initial and recovery Admin
  provisioning must exist outside this feature. Report missing operational bootstrap before release.
- **Permission catalog timing:** The baseline has permission tables but no complete future-feature
  seed. Default-deny remains correct until each feature approves and seeds its own stable codes.
- **Duplicate authorization logic:** Keep role ownership in Identity and action/resource checks in
  owning services; share only technical principal contracts, not business entities or repositories.
- **Partial architectural alignment:** Current Identity uses direct TypeORM/AuthService wiring.
  Align RBAC incrementally with real ports/use cases and avoid a repository-wide rewrite.
- **Availability of trusted context:** Missing or spoofed Gateway/ID-001 context must fail closed,
  never fall back to client role fields.

## Architecture Compliance

- **Clean Architecture:** Presentation parses DTOs and maps responses; application use cases
  coordinate ports; domain owns role/permission/last-Admin invariants; infrastructure implements
  TypeORM and authentication-context adapters.
- **Dependency direction:** Domain imports no NestJS, TypeORM, JWT, HTTP or Gateway code.
  Application depends only on domain types and ports. Infrastructure is bound in the Identity
  module composition root.
- **Identity ownership:** Roles, permissions and assignments remain in `bkpractice_identity` and
  inside the Identity application. No Role Service, Permission Service or Admin Service is created.
- **Authentication boundary:** ID-001 remains the source of authenticated identity, account status
  and token semantics. RBAC consumes verified context and never accepts provider/refresh tokens as
  authorization credentials.
- **Gateway boundary:** Gateway performs edge authentication/header sanitization and routing only;
  it does not query RBAC tables or contain role-assignment business rules.
- **Service-side enforcement:** Business services remain responsible for their protected actions,
  ownership and resource policy. Client visibility and Gateway coarse checks are not the sole
  authorization boundary.
- **Persistence isolation:** No cross-service SQL, TypeORM relation, datasource import or foreign
  key is introduced. `libs/` receives only a context-neutral transport contract if necessary, not
  User/Role/Permission entities or use cases.
- **Scope control:** No dynamic IAM, OAuth, MFA, ABAC/ReBAC, CQRS, event sourcing, Redis blacklist,
  audit microservice, role CRUD or future feature permission catalog is added.

> `plan.md` describes HOW. It must be reviewed against Approved `spec.md` before creating
> `tasks.md`; no RBAC source code is created in this phase.
