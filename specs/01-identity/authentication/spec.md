# ID-001 Authentication

## Status

Approved

Allowed values: `Proposed` | `Approved` | `Implemented` | `Verified`

## Goal

Allow a student whose BKPractice account has already been provisioned by the university to
establish and end an authenticated session by using either a student identifier and password or
the university's Microsoft identity provider. Authentication identifies who the caller is without
granting unauthorized privileges or exposing credentials.

## Actors

- **Provisioned student:** A person whose BKPractice account was created from an
  administrator-controlled student import.
- **Unauthenticated visitor:** A caller attempting a supported login or refresh flow. This actor
  cannot register or create an account through ID-001.
- **Authenticated user:** A provisioned user with a valid BKPractice access token.
- **University Microsoft Entra ID:** The trusted identity provider for Microsoft accounts issued by
  the university.
- **API Gateway:** The public entry point that verifies BKPractice access tokens and forwards
  trusted identity and role metadata.
- **Identity Service:** The owner of authentication credentials, linked provider identities,
  account status, token issuance, and refresh-session state.

## Context

Authentication answers **“Who are you?”** Authorization answers **“What are you allowed to do?”**
ID-001 covers authentication and session lifecycle only. Role, permission, profile, student import,
and administrative account-management workflows remain separate features.

BKPractice will not offer public registration in the initial university rollout. Student accounts
are provisioned before login from an administrator-controlled Excel import. A provisioned student
may authenticate with:

1. student identifier (`MSSV`) and password; or
2. a Microsoft account issued by the university and validated against the university's configured
   Microsoft Entra tenant.

Google login, Microsoft accounts outside the university tenant, automatic creation of external
users, and access for people outside the university are deferred to a future specification.

The existing foundation currently exposes email/password registration and login. That code is not
the approved target behavior and must remain unchanged during this specification phase. The
proposed shared initial password `123456` conflicts with the existing 10-character validation
baseline and requires a human security decision before this specification can become Approved.

## Functional Requirements

- **ID-001-FR-001 — No public registration:** The system MUST NOT expose a public operation that
  creates a BKPractice user account during the initial university rollout.
- **ID-001-FR-002 — Provisioned-account requirement:** Authentication MUST issue BKPractice tokens
  only for an existing account created through an approved provisioning process. Authentication
  MUST NOT silently create an account when login cannot find a matching provisioned user.
- **ID-001-FR-003 — Student-identifier login:** The system MUST allow a provisioned student to
  authenticate using a student identifier and password.
- **ID-001-FR-004 — Student-login validation:** The system MUST reject a missing, malformed, or
  unsupported student identifier or password before changing authentication state.
- **ID-001-FR-005 — Credential-failure confidentiality:** An unknown student identifier and an
  incorrect password MUST receive the same public authentication-failure behavior so the response
  does not confirm whether a student account exists.
- **ID-001-FR-006 — Microsoft school login:** The system MUST allow a provisioned student to
  authenticate through the university's Microsoft Entra ID tenant.
- **ID-001-FR-007 — Microsoft tenant validation:** Microsoft authentication MUST accept only an
  identity token or authorization result issued by the configured university tenant for the
  configured BKPractice application.
- **ID-001-FR-008 — Microsoft account matching:** On first Microsoft login, the verified Microsoft
  account MUST match the university email stored on exactly one provisioned BKPractice account.
  An unmatched or ambiguous identity MUST be rejected without creating a user.
- **ID-001-FR-009 — Stable Microsoft linking:** After the first successful match, the system MUST
  associate the BKPractice account with the Microsoft tenant and object identifiers so subsequent
  authentication does not depend only on a mutable email address.
- **ID-001-FR-010 — Account-status enforcement:** The system MUST issue new BKPractice tokens only
  for an `ACTIVE` account. An account in `LOCKED` or `PENDING` status MUST NOT log in through
  either method or refresh a session.
- **ID-001-FR-011 — Successful login result:** Successful student-identifier or Microsoft login
  MUST authenticate the same BKPractice user and produce a BKPractice access-token/refresh-token
  pair without returning password or provider-secret data.
- **ID-001-FR-012 — Access-token identity:** A BKPractice access token MUST identify one
  authenticated user, identify itself as an access token, include only the roles needed by
  downstream authorization, and have a configurable expiration.
- **ID-001-FR-013 — Protected API authentication:** The API Gateway MUST accept a valid BKPractice
  access token through the Bearer scheme, reject a missing, malformed, expired, incorrectly typed,
  or otherwise invalid token, and derive trusted identity metadata only from verified claims.
- **ID-001-FR-014 — Token-type separation:** An access token MUST NOT act as a refresh token, a
  refresh token MUST NOT authenticate a protected API request, and a Microsoft provider token MUST
  NOT be accepted as a BKPractice API token.
- **ID-001-FR-015 — Session refresh:** A valid, unexpired, unrevoked BKPractice refresh token for an
  `ACTIVE` account MUST be able to obtain a replacement access-token/refresh-token pair.
- **ID-001-FR-016 — Refresh-token rotation:** Successful refresh MUST revoke the submitted refresh
  token before issuing its replacement in the same session family. A consumed refresh token MUST
  NOT be accepted again.
- **ID-001-FR-017 — Invalid refresh rejection:** A malformed, expired, revoked, unknown, reused,
  incorrectly typed, or otherwise unverifiable refresh token MUST be rejected without issuing a
  token.
- **ID-001-FR-018 — Current-session logout:** Logout MUST revoke the refresh-token family for the
  submitted current session without revoking independent sessions on other devices. Repeating
  logout for that session MUST NOT restore or replace it.
- **ID-001-FR-019 — Access token after logout:** ID-001 MUST NOT introduce a distributed
  access-token blacklist. An issued access token remains usable until its configured expiration
  unless a separately approved requirement changes this rule.
- **ID-001-FR-020 — Password protection:** Password authentication MUST use the approved secure
  password-hashing mechanism. Plaintext passwords and password hashes MUST never be returned to a
  client.
- **ID-001-FR-021 — Authentication/authorization boundary:** Authentication MAY expose stored roles
  as time-bounded identity claims, but ID-001 MUST NOT create, grant, approve, or revoke roles or
  permissions.
- **ID-001-FR-022 — Imported default password:** The provisioning contract MUST initialize each
  imported student's local credential to `123456`, and Identity MUST persist only its Argon2 hash.
  ID-001 MUST NOT force a password change during first login.
- **ID-001-FR-023 — Independent concurrent sessions:** Each successful login MUST create an
  independent refresh-token family so a user may remain signed in on multiple devices.
- **ID-001-FR-024 — Microsoft session handoff:** A successful Microsoft callback MUST create a
  single-use opaque login code that expires after 60 seconds. The frontend MUST exchange that code
  for the BKPractice token pair; neither provider nor BKPractice bearer tokens may appear in the
  redirect URL.
- **ID-001-FR-025 — Current authenticated user:** ID-001 MUST provide an authenticated-user
  operation that returns only `userId`, `studentId`, stored roles, and current account status.
- **ID-001-FR-026 — Refresh replay containment:** Reuse of an already consumed refresh token MUST
  revoke only its associated session family. Other independently created session families MUST
  remain usable.

## Business Rules

- Only accounts created by the approved university provisioning workflow may authenticate in the
  initial rollout.
- A student identifier is an institution-owned login identifier and must uniquely identify one
  provisioned account after applying the approved canonicalization rule.
- The university email used for initial Microsoft matching must uniquely identify one provisioned
  account after trimming and case normalization.
- Microsoft authentication requires both a valid provider result and a matching BKPractice
  account. Membership in the Microsoft tenant alone does not create a BKPractice user.
- The stable Microsoft identity key is the combination of provider tenant identifier and provider
  object identifier. One Microsoft identity cannot be linked to multiple BKPractice users.
- Both supported login methods resolve to the same BKPractice user, roles, account status, and
  session model.
- The existing account-status vocabulary remains `ACTIVE`, `LOCKED`, and `PENDING`. ID-001
  does not introduce `DISABLED`.
- Only `ACTIVE` accounts receive new tokens. Existing access tokens follow ID-001-FR-019 and expire
  naturally even if the account is later locked or made pending.
- Refresh credentials are single-use session credentials with configurable lifetimes longer than
  access-token lifetimes.
- Each successful login creates an independent refresh-token family. Refresh rotation stays in the
  same family; logout and replay containment affect only that family.
- The imported local credential starts as `123456`. Provisioning stores only its Argon2 hash, and
  ID-001 does not require a first-login password change. Voluntary Change Password is a separate
  feature.
- Role claims are time-bounded snapshots. Role management belongs to ID-003 RBAC.
- The provisioning workbook contract is `stt`, `mssv`, `họ tên`, `lớp`, and `emailTruong`.
  `stt` is presentation-only, while `lớp` belongs to Learning; Identity receives the unique MSSV,
  name/profile input, and normalized university email. Import parsing, row validation, class
  enrollment, and administrative reporting are not Authentication responsibilities.

## Authorization Rules

- Student-identifier login, Microsoft login initiation/callback, and refresh are public transport
  operations, but only a valid provisioned account may receive BKPractice tokens.
- The current Gateway contract requires a valid BKPractice Bearer access token plus the refresh
  credential for logout.
- Public callers cannot supply trusted roles, permissions, account status, Microsoft tenant
  identifiers, provider object identifiers, or trusted identity headers.
- The Gateway MUST remove caller-supplied trusted identity headers and replace them only with data
  derived from a verified BKPractice access token.
- Authentication success does not imply permission to access every course, class, assignment, or
  administration operation. Resource authorization remains with the owning service.
- The student provisioning process may assign the existing `STUDENT` role, but ID-001 does not
  implement that provisioning or role-assignment workflow.

## Inputs

### Student login — proposed route `POST /api/auth/login`

| Field       | Required | Requirements                                                        |
| ----------- | -------- | ------------------------------------------------------------------- |
| `studentId` | Yes      | Existing MSSV imported from the administrator-controlled workbook   |
| `password`  | Yes      | Non-empty credential string; it is not silently trimmed or modified |

The request MUST NOT accept role, permission, account status, password hash, token configuration,
provider identifiers, or trusted identity metadata.

### Microsoft login initiation — proposed route `GET /api/auth/microsoft`

The caller provides no trusted identity attributes or redirect URL. The system uses only its fixed
configured callback and frontend return locations.

### Microsoft callback — proposed route `GET /api/auth/microsoft/callback`

The callback accepts only the provider authorization response and correlation values required by
the approved Microsoft authorization flow. Email, tenant, object ID, roles, and account status
supplied directly by the browser are untrusted.

### Microsoft login-code exchange — proposed route `POST /api/auth/microsoft/exchange`

| Field       | Required | Requirements                                          |
| ----------- | -------- | ----------------------------------------------------- |
| `loginCode` | Yes      | Non-empty, opaque, single-use code issued by Identity |

The code expires after 60 seconds and MUST NOT be accepted more than once.

### Refresh — `POST /api/auth/refresh`

| Field          | Required | Requirements                            |
| -------------- | -------- | --------------------------------------- |
| `refreshToken` | Yes      | Non-empty BKPractice refresh credential |

### Logout — `POST /api/auth/logout`

| Input                   | Required | Requirements                                                     |
| ----------------------- | -------- | ---------------------------------------------------------------- |
| BKPractice Bearer token | Yes      | Valid, unexpired access token under the current Gateway contract |
| Body `refreshToken`     | Yes      | Refresh credential identifying the session to revoke             |

### Current authenticated user — proposed route `GET /api/auth/me`

The request requires a valid BKPractice Bearer access token and accepts no caller-supplied trusted
identity fields.

## Outputs

- Successful student-identifier login returns HTTP `200` with the BKPractice `userId`,
  `accessToken`, and `refreshToken`.
- Microsoft login initiation redirects the user agent only to the configured Microsoft
  authorization endpoint.
- Successful Microsoft callback authentication resolves the linked BKPractice `userId`, creates a
  single-use opaque login code, and redirects to the configured frontend with that code. Exchanging
  the code within 60 seconds returns the same BKPractice token-pair shape as student login.
- Successful refresh returns HTTP `200` with a replacement `accessToken` and `refreshToken`.
- Successful or idempotently repeated logout returns HTTP `204` with no response body after the
  submitted refresh family is unusable; other login families remain usable.
- The current-authenticated-user operation returns only `userId`, `studentId`, stored roles, and
  current account status.
- A BKPractice access token contains, at minimum, a subject user identifier, stored roles,
  access-token type, and expiration. It contains no password, password hash, Microsoft provider
  token, refresh credential, or unnecessary profile data.

## Error Cases

| Case                                                                                              | Observable behavior                                                                                           |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A public registration request is attempted                                                        | The operation is unavailable; no user or session is created.                                                  |
| Malformed JSON, unsupported fields, invalid student ID, or invalid field shape                    | The request is rejected using the existing validation/error convention without changing authentication state. |
| Unknown student identifier or incorrect password                                                  | Both cases receive the same generic authentication failure and no token is issued.                            |
| `LOCKED` or `PENDING` account attempts login or refresh                                           | The operation is rejected and no token is issued.                                                             |
| Microsoft authorization is denied or returns an error                                             | Login fails without creating or linking an account.                                                           |
| Microsoft issuer, audience, tenant, signature, expiration, state, nonce, or token type is invalid | Login is rejected without trusting any provider claims.                                                       |
| Valid university Microsoft identity has no unique matching provisioned account                    | Login is rejected without revealing whether a particular email or student record exists.                      |
| Microsoft identity is already linked to a different user                                          | Login is rejected and the identity conflict is recorded safely for administrative review.                     |
| Invalid, expired, revoked, reused, or incorrectly typed refresh token                             | Refresh is rejected and no replacement token is issued.                                                       |
| Missing, expired, or invalid BKPractice access token on a protected operation                     | The Gateway rejects the request and forwards no trusted identity metadata.                                    |
| Logout receives an already invalidated refresh credential with otherwise valid input              | Logout remains idempotent and does not disclose prior session state.                                          |
| Unexpected authentication or provider failure                                                     | The existing normalized error convention is used without credentials, tokens, hashes, or provider secrets.    |

ID-001 does not introduce a new error envelope. HTTP and error serialization remain compatible
with the existing Gateway, NestJS validation, and future approved provider-login contract.

## Edge Cases

- Student identifier canonicalization must not cause two different institutional identifiers to
  resolve to the same user.
- If multiple import records contain the same student identifier or university email,
  authentication rejects ambiguous matching; the provisioning workflow must resolve the data.
- Concurrent login attempts create independent refresh-token families.
- Concurrent use of one refresh token allows at most one successful rotation.
- Reuse of a consumed refresh token revokes its session family without revoking independent
  families.
- The first Microsoft link is atomic: failure cannot leave a partial provider association or
  successful BKPractice session.
- After linking, an approved change to the university email does not create another user; the
  stable tenant/object identifiers continue to identify the linked account.
- Repeating logout is safe and never issues credentials.
- A role or account-status change does not mutate an already issued access token. New token
  issuance uses current roles and status.
- Password whitespace and Unicode are treated as credential data and are not silently trimmed.

## Security Requirements

- **ID-001-SR-001 — Password confidentiality:** Passwords MUST never be persisted in plaintext,
  returned to clients, included in logs, or embedded in errors.
- **ID-001-SR-002 — Password hashing:** Stored local credentials MUST use Argon2, the mechanism
  selected by the foundation, and password verification MUST use it safely.
- **ID-001-SR-003 — Imported credential safety:** Provisioning MUST hash the approved shared
  password `123456` with Argon2 before persistence. ID-001 MUST NOT log or return it and MUST apply
  configurable abuse protection to password login. The owner explicitly accepts the residual risk
  of not forcing a first-login password change.
- **ID-001-SR-004 — Microsoft protocol validation:** Microsoft login MUST validate the provider
  signature, issuer, configured application audience, configured university tenant, expiration,
  token purpose, and authorization-flow correlation before trusting identity claims.
- **ID-001-SR-005 — Microsoft password isolation:** BKPractice MUST never request, receive, store,
  proxy, or verify the user's Microsoft password.
- **ID-001-SR-006 — Account-linking integrity:** Microsoft linking MUST use verified provider claims
  and a unique provisioned account match; browser-supplied email or provider identifiers are never
  trusted.
- **ID-001-SR-007 — Provider secret protection:** Microsoft application credentials and signing
  configuration MUST be supplied through validated server configuration and excluded from clients,
  source control, responses, and logs.
- **ID-001-SR-008 — Refresh-token storage:** A persisted refresh credential MUST be stored in a form
  that cannot be used directly as the bearer credential if storage is disclosed.
- **ID-001-SR-009 — Token confidentiality:** BKPractice access/refresh tokens, provider tokens,
  authorization codes, signing secrets, and authorization headers MUST be excluded from logs.
- **ID-001-SR-010 — Minimal BKPractice claims:** BKPractice tokens contain only the claims needed
  for identity, validation, expiration, rotation, and downstream role authorization.
- **ID-001-SR-011 — Privilege-escalation prevention:** Authentication input cannot control roles,
  permissions, trusted identity headers, signing parameters, provider linkage, or account status.
- **ID-001-SR-012 — Information-leakage prevention:** Login failures do not distinguish an unknown
  student record from an incorrect password or unmatched provider email.
- **ID-001-SR-013 — Status enforcement:** `LOCKED` and `PENDING` users cannot obtain new
  BKPractice access or refresh tokens.
- **ID-001-SR-014 — Token-purpose validation:** Every token-consuming operation verifies integrity,
  expiration, intended issuer/audience where applicable, and token purpose before trusting claims.
- **ID-001-SR-015 — Transport protection:** Production credentials, authorization codes, and tokens
  are transmitted only over encrypted transport and are never placed in a URL.
- **ID-001-SR-016 — Abuse resistance:** Public authentication initiation, callback, credential
  login, and refresh operations SHOULD use configurable Gateway rate limiting without adding risk
  scoring or enterprise identity infrastructure.
- **ID-001-SR-017 — One-time login-code safety:** The Microsoft handoff code MUST be
  cryptographically unpredictable, expire after 60 seconds, be consumed atomically once, and map
  only to the minimum local identity state required to issue a BKPractice session.
- **ID-001-SR-018 — Refresh replay containment:** Refresh-token family state MUST allow a detected
  replay to revoke the affected family without revealing token/session details or revoking other
  independent families.

## Acceptance Criteria

- **ID-001-AC-001:** Given any public account-creation request, when it reaches BKPractice, then no
  user or session is created because public registration is unavailable.
- **ID-001-AC-002:** Given a provisioned `ACTIVE` student and correct student identifier/password,
  when login is attempted, then the correct BKPractice user and token pair are returned.
- **ID-001-AC-003:** Given an unknown student identifier or incorrect password, when login is
  attempted, then both cases receive the same generic failure and no token is issued.
- **ID-001-AC-004:** Given malformed or extra student-login fields, when validation runs, then the
  request is rejected before authentication state changes.
- **ID-001-AC-005:** Given an `ACTIVE` provisioned student using the configured university
  Microsoft tenant and matching university email, when Microsoft login completes, then the
  Microsoft identity is linked atomically and a BKPractice session is established for that same
  user.
- **ID-001-AC-006:** Given a valid Microsoft account from another tenant, when login is attempted,
  then BKPractice rejects it and creates neither a user nor session.
- **ID-001-AC-007:** Given a valid university Microsoft identity without exactly one matching
  provisioned account, when login is attempted, then it is rejected without automatically creating
  a user or revealing student-record existence.
- **ID-001-AC-008:** Given a Microsoft identity already linked to a provisioned user, when a later
  valid login occurs, then stable tenant/object identifiers resolve the same BKPractice user.
- **ID-001-AC-009:** Given a forged, expired, incorrectly targeted, or incorrectly correlated
  Microsoft response, when callback processing occurs, then no provider claim is trusted and no
  BKPractice token is issued.
- **ID-001-AC-010:** Given an account in `LOCKED` or `PENDING` status, when either login method or
  refresh is attempted, then no new token is issued.
- **ID-001-AC-011:** Given either successful login method, when the BKPractice access token is
  inspected, then it contains only required identity, role, type, and expiration claims and no
  credential or provider token.
- **ID-001-AC-012:** Given a valid refresh token for an `ACTIVE` account, when refresh succeeds,
  then a replacement pair is returned and the consumed refresh token cannot be reused.
- **ID-001-AC-013:** Given an invalid, expired, revoked, reused, or incorrectly typed refresh token,
  when refresh is requested, then no token is issued.
- **ID-001-AC-014:** Given a valid authenticated logout request, when logout completes, then the
  response has no body and the submitted refresh session cannot be used again.
- **ID-001-AC-015:** Given a protected API request without a valid BKPractice access token, when it
  reaches the Gateway, then it is rejected and no trusted identity headers are forwarded.
- **ID-001-AC-016:** Given caller-supplied trusted identity or role headers, when the Gateway handles
  the request, then they are removed and replaced only from a verified BKPractice access token.
- **ID-001-AC-017:** Given any successful or failed authentication operation, when responses and
  application logs are reviewed, then they contain no plaintext password, password hash, provider
  application credential, authorization code, provider token, or unintended BKPractice token.
- **ID-001-AC-018:** Given a Microsoft login flow, when browser redirects are inspected, then no
  provider or BKPractice bearer token is exposed in a URL.
- **ID-001-AC-019:** Given an imported student account, when credential persistence is inspected,
  then the plaintext `123456` is absent and only its Argon2 hash is stored; first login can complete
  without a mandatory password-change gate.
- **ID-001-AC-020:** Given a successful Microsoft callback, when its opaque login code is exchanged
  once within 60 seconds, then a BKPractice token pair is returned; a late or second exchange is
  rejected without issuing another token.
- **ID-001-AC-021:** Given two successful logins for one user, when one session logs out, then its
  refresh family is unusable while the other session can still refresh.
- **ID-001-AC-022:** Given a consumed refresh token is replayed, when replay handling completes,
  then its family is revoked and a separate independently created family remains usable.
- **ID-001-AC-023:** Given a valid BKPractice access token, when the current-user operation is
  called, then it returns only `userId`, `studentId`, roles, and status; without a valid access token
  it returns an authentication failure.
- **ID-001-AC-024:** Given workbook data with `stt`, `mssv`, `họ tên`, `lớp`, and `emailTruong`,
  when the separate provisioning boundary supplies Identity data, then Authentication uses MSSV
  for local login and normalized `emailTruong` for first Microsoft matching without owning `stt`
  or class enrollment.

## Out of Scope

- Public registration and self-service account creation
- Google Login and authentication for people outside the university
- Microsoft personal accounts or Microsoft organizational tenants other than the configured
  university tenant
- Excel parsing, file upload, row validation, import reporting, and account-provisioning
  implementation
- Class enrollment or Learning Service updates from the imported workbook
- Forgot Password and Reset Password
- General Change Password behavior and its user-facing page
- Email Verification
- MFA / 2FA
- Complete Profile Management
- Role Management, Permission Management, and User Administration
- Lecturer/Admin provisioning
- Device management and advanced session-management UI
- Distributed access-token blacklist
- Keycloak, external identity brokers, device fingerprinting, risk scoring, CQRS, and Event Sourcing

## Dependencies

- [BKPractice system architecture](../../../docs/architecture/system-architecture.md)
- [Identity Service architecture](../../../docs/architecture/identity-service.md)
- [Service architecture matrix](../../../docs/architecture/service-architectures.md)
- [Dependency rules](../../../docs/architecture/dependency-rules.md)
- [ADR 0001: Service-specific Internal Architectures](../../../docs/adr/0001-service-specific-internal-architectures.md)
- [SDD workflow](../../README.md)
- [Architecture reference for SDD](../../00-system/architecture-reference.md)
- [Service boundaries](../../00-system/service-boundaries.md)
- [Roles and permissions](../../00-system/roles-permissions.md)
- [Database strategy](../../00-system/database-strategy.md)
- [Definition of Done](../../00-system/definition-of-done.md)
- A future administrator-controlled provisioning specification must implement the approved workbook
  contract (`stt`, `mssv`, `họ tên`, `lớp`, `emailTruong`) and guarantee unique MSSV/email identity
  data before ID-001 can be exercised end to end.
- ID-002 Profile and ID-003 RBAC remain separate specifications.

## Open Questions

None. Product decisions were resolved and approved by the human owner on 2026-09-01. Deployment
values such as Microsoft tenant ID and client ID remain required environment configuration, not
open product requirements.

## Revision History

| Date       | Revision | Author/Reviewer | Summary                                                                          |
| ---------- | -------- | --------------- | -------------------------------------------------------------------------------- |
| 2026-09-01 | 0.1      | Codex / TBD     | Initial Proposed email/password registration specification                       |
| 2026-09-01 | 0.2      | Codex / TBD     | Replaced registration with provisioned student ID and university Microsoft login |
| 2026-09-01 | 1.0      | Product Owner   | Resolved authentication decisions and approved ID-001                            |

> `spec.md` describes WHAT. Detailed folders, classes, repository implementations, Microsoft
> libraries, TypeORM mappings, transactions, and execution order belong in a future `plan.md`
> after human approval.
