# ID-001 Authentication Implementation Plan

## Status

Approved

Approved by the human product owner on `2026-09-01`.

## Related Specification

- [ID-001 Authentication](./spec.md)
- Approved revision: `1.0`
- Approval date: `2026-09-01`

This plan implements the Approved specification without changing its requirements. The
administrator Excel-import workflow and Change Password page remain separate features.

## Target Service

Service: Identity

Edge integration: API Gateway changes are limited to routing, access-token verification, public
route metadata, redirect forwarding, and authentication-specific rate limiting. The Gateway will
not contain account, Microsoft-linking, or session business rules.

## Required Service Architecture

Architecture: Clean Architecture + domain-oriented feature modules

The Authentication feature follows the approved feature-first dependency direction:

```text
presentation -> application -> domain
infrastructure ----implements----^ application ports
```

The current shallow module will be aligned incrementally because ID-001 introduces real workflow
and infrastructure seams. Existing TypeORM entities remain persistence models; this plan does not
trigger a repository-wide Identity refactor.

## Existing Code Impact

### Current state

- `AuthController` exposes public register, email/password login, refresh, and logout.
- `AuthService` directly coordinates TypeORM, transactions, Argon2, JWT, and configuration.
- `User` has unique `email`, password hash, status, roles, and profile, but no MSSV.
- `RefreshToken` stores token ID, Argon2 hash, user ID, expiration, and revocation time, but has no
  session-family metadata.
- There is no Microsoft identity association, OAuth state store, login-code exchange, `/auth/me`,
  or Identity-specific test suite.
- Gateway verifies BKPractice access tokens, strips caller identity headers, and forwards
  `/api/auth` to Identity. Its public routes still contain register and omit Microsoft routes.
- Gateway does not follow redirects and currently drops the upstream `Location` header.
- Identity configuration does not require Redis or Microsoft Entra settings.
- Argon2, JWT, TypeORM, ioredis, validation, Swagger, and the global Gateway throttler already
  exist. `@azure/msal-node` is not installed.

### Change classification

| Classification | Planned treatment                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUSE          | User/Profile/Role persistence, account statuses, Argon2, Nest JWT, TypeORM datasource, global validation, Redis client library, Gateway proxy             |
| MODIFY         | User and refresh-token persistence models, entity registry, Auth module/controller/DTOs, configuration validation, Gateway public routes/proxy/throttling |
| CREATE         | Application use cases and ports, Microsoft adapter, Redis auth-flow adapter, TypeORM repository adapters, external-identity entity, migration, auth tests |
| REMOVE         | Public register handler/DTO and monolithic `AuthService` after replacement behavior is tested                                                             |

Existing records are preserved. Legacy accounts without MSSV remain in the database but cannot use
the Approved student-login flow until the separate provisioning process supplies valid identity
data.

## Domain Changes

Only concepts required by ID-001 are introduced:

- **AuthenticationAccount:** Framework-independent projection containing `userId`, `studentId`,
  normalized university email, `AccountStatus`, and role names. A password-bearing repository
  projection exposes `passwordHash` only to the student-login use case.
- **AccountStatus:** Reuse `ACTIVE | LOCKED | PENDING`. New token issuance is allowed only for
  `ACTIVE`.
- **MicrosoftIdentity:** Association of one Identity-owned user with provider `MICROSOFT`, immutable
  `tenantId + objectId`, and normalized `preferred_username` observed at link time.
- **RefreshSessionFamily:** Independent login session identified by `familyId`. Rotation stays in
  one family; logout or replay revokes that family only.
- **Authentication errors:** Framework-independent errors for invalid credentials, inactive
  account, invalid provider identity/state/code, link conflict, invalid refresh credential, and
  unauthenticated access.

Invariants:

- MSSV and normalized university email each resolve at most one provisioned user.
- A Microsoft `tenantId + objectId` links to one user; one user has at most one Microsoft link.
- Provider membership alone never creates a user.
- All login and refresh paths check current account status before issuing tokens.
- Raw passwords, refresh tokens, Microsoft tokens, authorization codes, and client secrets never
  enter domain return types.
- The approved shared initial password creates no `mustChangePassword` state in ID-001.

## Application / Use Cases

### `LoginWithStudentId`

- Input: trimmed MSSV and unmodified password.
- Load the password-bearing account projection by MSSV.
- Verify with `PasswordHasher`; unknown MSSV and wrong password return one generic error.
- Use a fixed dummy Argon2 hash for unknown MSSV to reduce timing differences.
- Require `ACTIVE`, create a new refresh family, and return `userId + TokenPair`.

### `StartMicrosoftLogin`

- Accept no caller identity and no arbitrary redirect target.
- Generate state, nonce, and PKCE verifier/challenge.
- Store the one-time OAuth transaction for five minutes through `AuthFlowStore`.
- Request the university single-tenant authorization URL through
  `MicrosoftIdentityProvider` with `openid profile email` scopes.
- Return only the authorization URL to Presentation for HTTP redirect.

### `CompleteMicrosoftLogin`

- Input: provider authorization code, state, and provider error fields.
- Atomically consume stored OAuth state; reject missing, expired, or reused state.
- Redeem the code with its PKCE verifier through the Microsoft adapter.
- Require configured tenant/client audience, nonce, `preferred_username`, `tid`, and `oid`.
- Resolve an existing link by `tid + oid`; otherwise match exactly one normalized
  `preferred_username` to `emailTruong` and atomically create the link.
- Reject unmatched, ambiguous, conflicting, or non-`ACTIVE` accounts without creating users.
- Store a random one-time login code mapped only to `userId` for 60 seconds and return the fixed
  frontend redirect URL containing that opaque code.
- Discard Microsoft authorization/provider tokens after extracting verified claims; do not call
  Microsoft Graph.

### `ExchangeMicrosoftLoginCode`

- Input: opaque `loginCode`.
- Atomically consume it; a second or late exchange fails.
- Reload status/roles, require `ACTIVE`, create an independent refresh family, and return
  `userId + TokenPair`.

### `RefreshSession`

- Verify refresh signature, expiration, purpose, `sub`, `jti`, and `fid`.
- Load stored token by `jti + userId`, verify its Argon2 hash, and check account status.
- Use a TypeORM transaction and conditional update or row lock so only one rotation wins.
- Insert the replacement in the same family and return a JSON token pair.
- Reuse of a consumed token revokes that family and returns the generic refresh error. Other
  family IDs remain untouched.

### `LogoutCurrentSession`

- Inputs: authenticated access-token user ID and submitted refresh token.
- Verify refresh purpose and ownership; another user's token cannot revoke that user's session.
- Revoke the submitted token family. Missing, revoked, expired, or malformed refresh credentials
  remain idempotent and reveal no session details.

### `GetCurrentAuthenticatedUser`

- Input: authenticated access-token user ID.
- Load the current Identity account projection.
- Return exactly `userId`, `studentId`, `roles`, and `status`.
- Do not load or expose complete Profile, password, refresh, or provider data.

### Application ports

| Port                         | Layer and purpose                                                 | Adapter   |
| ---------------------------- | ----------------------------------------------------------------- | --------- |
| `AuthAccountRepository`      | MSSV/email/ID authentication projections and current roles/status | TypeORM   |
| `ExternalIdentityRepository` | Stable Microsoft lookup and atomic first link                     | TypeORM   |
| `RefreshSessionRepository`   | Create, atomic rotate, family revoke, and replay handling         | TypeORM   |
| `PasswordHasher`             | Credential hashing/verification boundary                          | Argon2    |
| `BkTokenService`             | Issue and verify typed BKPractice token claims                    | Nest JWT  |
| `MicrosoftIdentityProvider`  | Authorization URL and verified code redemption                    | MSAL Node |
| `AuthFlowStore`              | One-time OAuth transactions and login codes                       | Redis     |

These are concrete security, persistence, or external-provider seams. No generic base repository,
command bus, CQRS layer, or empty interface hierarchy is introduced.

## Requirement Traceability

| Requirement   | Implementation path                                               | Primary verification                        |
| ------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| ID-001-FR-001 | Remove register handler/DTO and Gateway public registration entry | ID-001-AC-001                               |
| ID-001-FR-002 | Repository lookup only; Microsoft rejects unmatched accounts      | ID-001-AC-001, ID-001-AC-007                |
| ID-001-FR-003 | `LoginWithStudentId`                                              | ID-001-AC-002                               |
| ID-001-FR-004 | Login DTO and global whitelist validation                         | ID-001-AC-004                               |
| ID-001-FR-005 | Generic error and dummy-hash verification path                    | ID-001-AC-003                               |
| ID-001-FR-006 | Microsoft start/complete use cases                                | ID-001-AC-005                               |
| ID-001-FR-007 | Single-tenant MSAL adapter and validated config                   | ID-001-AC-006, ID-001-AC-009                |
| ID-001-FR-008 | Normalized `preferred_username` repository match                  | ID-001-AC-005, ID-001-AC-007                |
| ID-001-FR-009 | External identity table and atomic linking                        | ID-001-AC-005, ID-001-AC-008                |
| ID-001-FR-010 | Shared status policy in login and refresh                         | ID-001-AC-010                               |
| ID-001-FR-011 | Shared token-pair issuance coordinator                            | ID-001-AC-002, ID-001-AC-005                |
| ID-001-FR-012 | Minimal typed JWT claims and configurable TTL                     | ID-001-AC-011                               |
| ID-001-FR-013 | Gateway auth middleware and sanitized headers                     | ID-001-AC-015, ID-001-AC-016                |
| ID-001-FR-014 | Purpose checks in Gateway/JWT/MSAL adapters                       | ID-001-AC-009, ID-001-AC-011, ID-001-AC-013 |
| ID-001-FR-015 | `RefreshSession` and account reload                               | ID-001-AC-012                               |
| ID-001-FR-016 | Transactional rotation                                            | ID-001-AC-012                               |
| ID-001-FR-017 | Generic refresh error mapping                                     | ID-001-AC-013                               |
| ID-001-FR-018 | Current-family logout                                             | ID-001-AC-014, ID-001-AC-021                |
| ID-001-FR-019 | No blacklist; access TTL remains authoritative                    | ID-001-AC-014 and expiry test               |
| ID-001-FR-020 | Argon2 adapter and response allowlist                             | ID-001-AC-017, ID-001-AC-019                |
| ID-001-FR-021 | Read-only role claims; no RBAC mutation                           | ID-001-AC-011, ID-001-AC-016                |
| ID-001-FR-022 | Provisioning dependency hashes approved credential                | ID-001-AC-019                               |
| ID-001-FR-023 | New family per successful login                                   | ID-001-AC-021                               |
| ID-001-FR-024 | Redis 60-second one-time login-code exchange                      | ID-001-AC-018, ID-001-AC-020                |
| ID-001-FR-025 | Protected current-user use case                                   | ID-001-AC-023                               |
| ID-001-FR-026 | Replay revokes one family only                                    | ID-001-AC-022                               |

## Persistence

All persistent authentication data remains in `bkpractice_identity`.

- `AuthAccountRepository` queries existing `users`, `roles`, and `user_roles`; it selects
  `password_hash` only for local verification.
- `ExternalIdentityRepository` owns Microsoft lookup/link transactions. Initial matching uses
  normalized `preferred_username`; established links use `tenantId + oid`.
- `RefreshSessionRepository` owns refresh rows and family transitions. Rotation uses a transaction
  plus conditional `revoked_at IS NULL` update so concurrent consumers cannot both win.
- Raw refresh credentials are never stored; the existing Argon2 hash strategy is retained.
- Microsoft provider tokens are not persisted.
- OAuth state/nonce/PKCE and login codes are ephemeral Redis values, not business records.
- No other service database is read and no Identity business entity moves into `libs/`.

## Database Changes

### `users`

- Add nullable `student_id varchar(64)`.
- Add a unique partial index for non-null `student_id`.
- Keep existing `email` as the persisted normalized `emailTruong`; do not rename it.
- Add a unique functional index on `LOWER(email)` after checking case-insensitive duplicates.
- Keep `password_hash`, status enum, roles, and profile relation unchanged.

`student_id` is nullable only for foundation-data compatibility. Authentication requires a
non-null value. Provisioning may backfill intended students before a later migration makes it
non-null.

### `external_identities` (new)

- `id uuid` primary key
- `user_id uuid` local foreign key to `users` with cascade delete
- `provider varchar`, constrained by the domain to `MICROSOFT`
- `provider_tenant_id varchar(64)`
- `provider_subject_id varchar(128)` for Microsoft `oid`
- `provider_username_at_link varchar(320)`
- `created_at`, `updated_at`
- Unique `(provider, provider_tenant_id, provider_subject_id)`
- Unique `(user_id, provider)`
- Index `user_id`

### `refresh_tokens`

- Add indexed `family_id uuid`, non-null after backfill.
- Add nullable `replaced_by_token_id uuid` for rotation lineage; never expose it publicly.
- Retain token ID, user ID, token hash, expiration, revocation, and creation fields.
- Do not add device fingerprints, device names, or Redis-backed persistent sessions.

## Migration

Create one Identity-owned TypeORM migration named conceptually
`AddStudentMicrosoftAuthentication`; do not modify the baseline migration.

Up sequence:

1. Abort with an actionable error if case-insensitive duplicate emails exist.
2. Add nullable `users.student_id` and its partial unique index.
3. Add the case-insensitive unique email index.
4. Create `external_identities` and its local foreign key/unique indexes.
5. Add nullable `refresh_tokens.family_id` and `replaced_by_token_id`.
6. Backfill every existing refresh row with its own generated family UUID.
7. Make `family_id` non-null and add the family index.

Down removes only these indexes, table, and columns in reverse dependency order. Revert is
destructive for links/family metadata and must be announced. Verify run/revert/run against an
isolated Identity test database.

## API

| Method and route                    | Authentication                  | Presentation behavior                 | Application operation         |
| ----------------------------------- | ------------------------------- | ------------------------------------- | ----------------------------- |
| `POST /api/auth/login`              | Public                          | Validate MSSV/password; HTTP 200 JSON | `LoginWithStudentId`          |
| `GET /api/auth/microsoft`           | Public                          | HTTP 302 to Microsoft                 | `StartMicrosoftLogin`         |
| `GET /api/auth/microsoft/callback`  | Public provider callback        | HTTP 302 to frontend with opaque code | `CompleteMicrosoftLogin`      |
| `POST /api/auth/microsoft/exchange` | Public, one-time code           | HTTP 200 JSON token pair              | `ExchangeMicrosoftLoginCode`  |
| `POST /api/auth/refresh`            | Public, refresh required        | HTTP 200 JSON replacement pair        | `RefreshSession`              |
| `POST /api/auth/logout`             | Valid access and refresh tokens | HTTP 204, no body                     | `LogoutCurrentSession`        |
| `GET /api/auth/me`                  | Valid access token              | Minimal identity JSON                 | `GetCurrentAuthenticatedUser` |

Remove `POST /api/auth/register` and its Gateway public-route entry. Swagger documents DTOs,
Bearer requirements, redirects, and public error statuses.

Gateway changes:

- Public allowlist becomes login, Microsoft start/callback/exchange, and refresh.
- Logout and `/me` remain protected.
- Forward safe `Location` response headers for 302 flows; continue dropping `set-cookie` because
  the Approved refresh delivery is JSON.
- Preserve removal of caller-provided `x-auth-user-id` and `x-auth-roles`.
- Extend the existing Nest throttler with path-aware limits: default 120/minute, password login
  5/minute/IP, Microsoft start/callback/exchange and refresh 30/minute/IP. Limits and TTL are
  configurable.

Identity also verifies the forwarded Bearer token for protected auth endpoints and compares the
logout access-token subject with the refresh-token subject. This is defense in depth, not duplicate
account business logic.

## DTO / Validation

- `StudentLoginDto`: required string `studentId` and password; trim only surrounding MSSV
  whitespace. Do not invent an MSSV regex. Bound lengths and allow the approved six-character
  password.
- `MicrosoftCallbackDto`: optional provider `code`, `state`, `error`, `error_description`; a valid
  success pair is enforced by the application.
- `MicrosoftExchangeDto`: required bounded opaque `loginCode`.
- `RefreshTokenDto`: required bounded non-empty `refreshToken`.
- `TokenPairResponseDto`: `accessToken`, `refreshToken`.
- `AuthenticatedResponseDto`: `userId` plus token pair.
- `CurrentAuthUserResponseDto`: exactly `userId`, `studentId`, `roles`, `status`.

Global `ValidationPipe` retains transform, whitelist, and `forbidNonWhitelisted`. DTOs never accept
roles, status, email, Microsoft identifiers, token claims, or redirect URLs from callers. Response
DTOs prevent persistence objects/password hashes from crossing Presentation.

## Authorization

- Login/Microsoft/refresh paths are public only because they establish or rotate authentication.
- Only a provisioned `ACTIVE` account receives tokens.
- Microsoft tenant membership is insufficient without an existing account match.
- Logout and `/me` require a verified BKPractice access token.
- Logout access-token subject must equal refresh-token subject.
- Roles are read from Identity and issued as claims. Requests cannot assign or mutate roles or
  permissions.
- Course/class/resource authorization remains with the owning service.

## Messaging / Events

N/A. ID-001 has no approved RabbitMQ event. Microsoft OAuth is synchronous HTTPS through an
adapter; adding an auth event would expand scope.

## Realtime

N/A. ID-001 has no Socket.IO behavior. Redis stores only short-lived OAuth state and one-time login
codes, not persistent sessions.

## Infrastructure Adapters

- **Argon2PasswordHasher:** Wrap existing `argon2.verify/hash`. ID-001 verifies; the separate
  provisioning feature hashes the approved default password.
- **JwtBkTokenService:** Wrap Nest JWT with separate validated access/refresh secrets and
  configurable TTLs. Access claims: `sub, roles, type=access`; refresh claims:
  `sub, jti, fid, type=refresh`, plus standard `iat/exp`.
- **MsalMicrosoftIdentityProvider:** Use `@azure/msal-node`
  `ConfidentialClientApplication`, tenant-specific authority, Authorization Code Flow, and PKCE.
  Return only verified `preferred_username`, `tid`, and `oid`; no Graph permission/token cache.
- **RedisAuthFlowStore:** Reuse `ioredis` with namespaced keys. OAuth transaction TTL is 300
  seconds; login-code TTL is 60 seconds. Consume through atomic `GETDEL` or equivalent. Never store
  raw provider/BKPractice bearer tokens.
- **TypeORM adapters:** Implement only the three repository ports and own transactions, locking,
  and query-builder details.

Implementation-time dependency change:

- Add runtime dependency `@azure/msal-node` using pnpm and update only `pnpm-lock.yaml`.
- Reuse existing ioredis, Argon2, Nest JWT, TypeORM, class-validator, and Swagger.
- Do not add Passport, Microsoft Graph SDK, session framework, OAuth broker, or another service.

Required Identity configuration:

- `REDIS_URL`
- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_REDIRECT_URI`
- `AUTH_WEB_LOGIN_REDIRECT_URL`

Required Gateway rate-limit configuration:

- `AUTH_RATE_LIMIT_TTL_MS` default `60000`
- `AUTH_PASSWORD_LOGIN_RATE_LIMIT` default `5`
- `AUTH_OAUTH_RATE_LIMIT` default `30`

Microsoft configuration fails fast when missing. Real credentials remain outside source control.

## Error Handling

Domain/application errors contain stable categories but no Nest imports. Presentation maps them to
the existing Nest/Gateway convention:

| Error category                                                               | HTTP behavior                            |
| ---------------------------------------------------------------------------- | ---------------------------------------- |
| Invalid DTO or malformed callback                                            | 400 through existing validation/envelope |
| Unknown MSSV, wrong password, inactive account, unmatched Microsoft identity | One generic 401                          |
| Invalid/expired/reused login code or refresh token                           | Generic 401                              |
| Microsoft link uniqueness conflict                                           | Generic 401 publicly; safe internal log  |
| Missing/invalid access token                                                 | 401 at Gateway and Identity guard        |
| Microsoft or Redis unavailable                                               | 503 without provider/token details       |
| Unexpected persistence failure                                               | Existing normalized 500 with request ID  |

Logout catches invalid or already revoked refresh credentials after access authentication and
returns 204. It never reveals whether a family existed.

## Security

| Security requirements       | Enforcement                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------- |
| ID-001-SR-001–ID-001-SR-003 | Response allowlists, Argon2 adapter, provisioning stores only hashes, login rate limit |
| ID-001-SR-004–ID-001-SR-007 | MSAL, tenant authority, PKCE/state/nonce, fixed redirects, validated config/claims     |
| ID-001-SR-008–ID-001-SR-010 | Hashed refresh tokens, minimal JWT claims, no provider-token persistence/logging       |
| ID-001-SR-011–ID-001-SR-014 | Whitelisted DTOs, generic errors, status and strict token-purpose checks               |
| ID-001-SR-015               | HTTPS production configuration and opaque-code handoff                                 |
| ID-001-SR-016               | Configurable path-aware Gateway throttling                                             |
| ID-001-SR-017               | Random 60-second login code consumed atomically once                                   |
| ID-001-SR-018               | Transactional family-only replay revocation                                            |

Additional controls:

- Sanitize logs and omit auth request bodies.
- Never accept Microsoft tokens as BKPractice tokens.
- Never accept client-supplied email, tenant, object ID, role, status, or redirect URI.
- Keep callback/frontend redirects fixed and configured.
- Clear OAuth state atomically before provider-code redemption.
- Keep access tokens short-lived using the existing configurable default `15m`; no blacklist.
- Record the owner's acceptance of the shared `123456` risk. Rate limiting and Argon2 reduce but
  do not eliminate pre-owner account takeover.

## Testing Strategy

### Unit tests

- Every use case: success, generic failures, inactive status, and no unintended calls after
  failure.
- Student login: MSSV trimming, unchanged password, dummy hash, roles, independent family.
- Microsoft: state/nonce/PKCE, tenant/audience claims, first/repeated link, unmatched/ambiguous
  user, conflict, 60-second code, single use.
- Refresh: valid rotation, invalid/expired token, status, concurrent winner, replay family revoke,
  and other-family isolation.
- Logout: subject mismatch, family revoke, idempotency, other-device preservation.
- `/me`: exactly four approved fields.
- JWT/Argon2 adapters and Gateway public/protected paths, spoofed headers, typed tokens, rate limit,
  and `Location` forwarding.

### Persistence/integration tests

- Migration run/revert/run on isolated PostgreSQL.
- Unique non-null MSSV and case-insensitive email constraints.
- Microsoft link uniqueness and atomic concurrent first link.
- Refresh single winner, family replay revocation, and other-family preservation.
- Redis atomic consume and 300/60-second TTLs.
- Backfill existing refresh rows with unique family IDs.

### API/E2E tests

| Acceptance criteria         | Scenario group                                                  |
| --------------------------- | --------------------------------------------------------------- |
| ID-001-AC-001–ID-001-AC-004 | No register; MSSV login success/generic failure/validation      |
| ID-001-AC-005–ID-001-AC-009 | Microsoft tenant match/link/reuse and invalid-provider failures |
| ID-001-AC-010–ID-001-AC-011 | Account status and minimal token claims                         |
| ID-001-AC-012–ID-001-AC-014 | Refresh rotation/rejection and logout                           |
| ID-001-AC-015–ID-001-AC-018 | Gateway rejection/header sanitization/log/redirect safety       |
| ID-001-AC-019–ID-001-AC-020 | Default-password hash fixture and one-time Microsoft exchange   |
| ID-001-AC-021–ID-001-AC-022 | Multi-device isolation and replay containment                   |
| ID-001-AC-023–ID-001-AC-024 | Minimal `/me` and provisioning-boundary mapping                 |

OAuth automation mocks `MicrosoftIdentityProvider`; a staging-tenant smoke test verifies real app
registration without secrets in fixtures. Final commands: `pnpm lint`, `pnpm typecheck`,
`pnpm test`, and `pnpm build`.

## Observability

- Preserve `x-request-id` across Gateway and Identity.
- Log coarse outcomes for login, Microsoft callback/link, refresh/replay, family revoke, and
  dependency outage.
- Success logs may include internal `userId` and family ID. Failed public logs use request ID and
  coarse reason, never MSSV/email.
- Never log passwords, raw tokens, authorization codes, PKCE verifier, nonce, client secret, or
  Microsoft claim payloads.
- Reuse the existing logger; add no metrics/tracing dependency.

## File Change Plan

### REUSE

- `apps/identity-service/src/modules/users/entities/profile.entity.ts`
- `apps/identity-service/src/modules/rbac/entities/role.entity.ts`
- `apps/identity-service/src/database/data-source.ts`
- `libs/common/src/bootstrap.ts`
- Existing JWT, Argon2, TypeORM, ioredis, validation, Swagger, and Gateway proxy infrastructure

### MODIFY

- `apps/identity-service/src/modules/users/entities/user.entity.ts`: add MSSV persistence.
- `apps/identity-service/src/modules/users/entities/refresh-token.entity.ts`: add family/lineage.
- `apps/identity-service/src/modules/identity.entities.ts`: register external identity.
- `apps/identity-service/src/modules/auth/auth.module.ts`: composition root.
- `apps/identity-service/src/identity-service.module.ts`: only if needed for adapter lifecycle.
- `libs/config/src/environment.ts` and `.env.example`: validated Microsoft/Redis/rate-limit config.
- `libs/contracts/src/index.ts`: export technical auth-token claims.
- `apps/api-gateway/src/api-gateway.module.ts`: bind path-aware throttler.
- `apps/api-gateway/src/auth/gateway-auth.middleware.ts`: public routes/header sanitization.
- `apps/api-gateway/src/proxy/gateway-proxy.service.ts`: forward safe `Location` redirects.
- `package.json` and `pnpm-lock.yaml`: add only `@azure/msal-node` with pnpm.

### CREATE

- `apps/identity-service/src/modules/auth/domain/`: projections, provider/session types, errors.
- `apps/identity-service/src/modules/auth/application/ports/`: seven concrete ports.
- `apps/identity-service/src/modules/auth/application/use-cases/`: seven approved use cases.
- `apps/identity-service/src/modules/auth/application/auth-token-issuer.ts`.
- `apps/identity-service/src/modules/auth/infrastructure/persistence/`: TypeORM adapters and
  external-identity persistence entity.
- `apps/identity-service/src/modules/auth/infrastructure/security/`: Argon2/JWT adapters.
- `apps/identity-service/src/modules/auth/infrastructure/microsoft/`: MSAL adapter.
- `apps/identity-service/src/modules/auth/infrastructure/redis/`: OAuth/login-code adapter.
- `apps/identity-service/src/modules/auth/presentation/`: controller, guard/decorator, DTOs.
- `apps/identity-service/src/database/migrations/*-AddStudentMicrosoftAuthentication.ts`.
- `libs/contracts/src/auth.contracts.ts`: technical access/refresh claim shapes.
- `apps/api-gateway/src/auth/gateway-throttler.guard.ts`.
- Focused unit, adapter, guard, migration, integration, and API tests.

### REMOVE after replacement tests pass

- `apps/identity-service/src/modules/auth/auth.service.ts`.
- `apps/identity-service/src/modules/auth/auth.controller.ts`.
- `apps/identity-service/src/modules/auth/dto/register.dto.ts`.
- Existing login/refresh DTOs after their approved replacements are wired.

No baseline migration, architecture document, unrelated service source, or business entity outside
Identity is modified.

## Implementation Order

1. Add MSAL dependency/config schemas and technical token contracts without changing routes.
2. Add migration and update Identity persistence models/entity registry.
3. Add domain types/errors and seven application ports.
4. Implement TypeORM, Argon2, JWT, Redis, and MSAL adapters with focused tests.
5. Implement student login and shared token issuance.
6. Implement Microsoft start/callback/exchange and atomic linking.
7. Implement refresh rotation/replay, logout, and current-user use cases.
8. Replace controller/DTOs, remove register, then remove monolithic `AuthService`.
9. Update Gateway routes, redirect forwarding, defense-in-depth auth, and throttling.
10. Add migration/integration/API tests and Swagger.
11. Run migration run/revert/run and Microsoft staging smoke test.
12. Run lint/typecheck/test/build and verify every FR/SR/AC trace.

## Risks

- **Shared default password:** `123456` is predictable and creates pre-owner takeover risk. The
  owner accepted it; mitigations are Argon2 at rest, generic errors, strict throttling, no public
  registration, and a separate voluntary Change Password feature.
- **Provisioning dependency:** ID-001 can use fixtures but cannot be Verified end to end until the
  separate import feature supplies unique MSSV/email and Argon2 hashes.
- **Legacy data:** Existing registration users lack MSSV. Nullable migration preserves them, but
  they cannot use new login until provisioned.
- **Microsoft configuration:** Wrong tenant/client/redirect config disables Microsoft login. Fail
  fast and smoke-test staging portal registration.
- **Redis outage:** Microsoft start/callback/exchange is unavailable; MSSV login and DB refresh
  remain available.
- **Rotation race:** Concurrent refresh can cause replay containment to revoke the family; document
  this approved secure behavior to clients.
- **Gateway redirect compatibility:** `Location` forwarding is required and needs a proxy test.
- **Provider outage:** Return safe 503 and never accept unverified claims as fallback.

## Architecture Compliance

- Presentation validates/translates HTTP, invokes one application operation, and maps errors; it
  performs no TypeORM, Argon2, Redis, JWT, or Microsoft workflow.
- Application coordinates authentication/session workflows through narrow ports and depends only
  on domain types.
- Domain imports no NestJS, TypeORM, Redis, JWT, MSAL, or HTTP implementation.
- Infrastructure owns TypeORM, Argon2, JWT, Redis, and MSAL. Auth module binds ports to adapters.
- Gateway verifies access tokens, strips spoofed headers, forwards redirects, and rate-limits; it
  does not match accounts, query Identity data, or create sessions.
- Persistent data remains in `bkpractice_identity`; Redis contains only ephemeral flow state. There
  is no cross-service SQL, foreign key, repository import, or shared business entity.
- `libs/contracts` receives only technical token claims, never User, MicrosoftIdentity, or
  RefreshSession domain models.
- Alignment is limited to Authentication. It does not restructure Profile/RBAC or introduce CQRS,
  event sourcing, Keycloak, Graph API, or another microservice.

> `plan.md` describes HOW. Implementation still requires Phase 06 `tasks.md` aligned with this
> Approved plan.
