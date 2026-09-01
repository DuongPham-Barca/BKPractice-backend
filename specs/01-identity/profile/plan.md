# ID-002 Profile Implementation Plan

## Status

Approved

Approved by the human product owner on `2026-09-01`.

This plan describes HOW to implement the Approved Profile specification and does not implement
source code. Implementation tasks must be created separately in the next SDD phase.

## Related Specification

- [ID-002 Profile](./spec.md)
- Status: `Approved`
- Approved revision: `0.4`
- Approval date: `2026-09-01`

The specification remains the source of truth for behavior, privacy, authorization and scope.
This plan must not add Profile fields, change ownership or introduce an authentication flow.

## Target Service

Service: Identity Service

Profile remains an Identity-owned feature. The API Gateway remains the only intended public entry
point and continues forwarding `/api/profile` and `/api/users` to Identity. Learning, Submission
and Community databases are not accessed by this feature.

## Required Service Architecture

Architecture: **Clean Architecture + domain-oriented feature modules**.

The implementation follows the approved Identity dependency direction:

```text
presentation -> application -> domain
infrastructure ----implements----^ application/domain ports
```

The current Identity code is a pragmatic, partially aligned foundation: the Profile persistence
model is under `modules/users/entities/`, while `AuthService` still combines application and
infrastructure concerns. ID-002 uses an incremental feature module and does not trigger a
repository-wide refactor. Existing TypeORM entities remain persistence models until a real Profile
domain behavior requires a separate domain object.

## Existing Code Impact

### Current foundation

- `apps/identity-service/src/modules/users/entities/profile.entity.ts` already models one Profile
  per User, with a unique `user_id`, `display_name varchar(100)`, nullable `avatar_url varchar(500)`
  and nullable `bio text`.
- `apps/identity-service/src/database/migrations/1700000000000-InitialIdentitySchema.ts` already
  creates the `profiles` table and its local User foreign key with cascade delete.
- `apps/identity-service/src/modules/users/entities/user.entity.ts` already owns the Profile
  relation and the `ACTIVE | LOCKED | PENDING` account-status vocabulary.
- `apps/identity-service/src/modules/identity.entities.ts` already registers `Profile` with the
  Identity datasource.
- `apps/identity-service/src/identity-service.module.ts` currently imports only `AuthModule` and
  common health/config/database infrastructure; a Profile module will need composition-root wiring.
- `libs/common/src/bootstrap.ts` already enables `ValidationPipe` with transformation, whitelist
  and `forbidNonWhitelisted`, and creates Swagger with Bearer support.
- `apps/api-gateway/src/proxy/gateway-proxy.service.ts` already routes `/api/profile` and
  `/api/users` to Identity.
- `apps/api-gateway/src/auth/gateway-auth.middleware.ts` currently protects every `/api` path
  except exact public Authentication routes. It therefore needs a narrow public-profile matcher;
  broad `/api/users` or `/api/profile` bypasses are not allowed.
- The current source has no Profile controller, Profile use cases, R2 adapter, Profile repository
  port, or Profile-specific tests.

### Change classification

| Classification | Treatment                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUSE          | Existing Profile/User persistence relation, Identity datasource/entity registry, global validation, Swagger/bootstrap, Gateway proxy, ID-001 authenticated identity context and account read capability |
| MODIFY         | Profile entity property semantics, Identity module composition, Identity configuration validation, `.env.example`, Gateway public-profile route matching, and the Profile migration set                 |
| CREATE         | Feature-first Profile module layers, application use cases/ports, TypeORM repository adapter, Cloudflare R2 adapter, DTOs/response mappers, Profile tests, and a constraint migration                   |
| REMOVE         | None. The existing Auth controller/service and ID-001 authentication behavior are outside ID-002 and must remain unchanged                                                                              |

No application source is changed in this phase. The paths above are a future implementation
inventory only.

## Domain Changes

### Profile domain object

Create a small framework-independent Profile domain object in the new Profile module because the
feature has real invariants (lazy initialization, controlled fields, bounded text, avatar-reference
integrity and retry-safe updates). It should contain only:

- `profileId` and `userId`;
- `displayName` (non-empty, maximum 100 characters);
- nullable approved avatar object reference;
- nullable `bio` (maximum 1,000 characters);
- explicit patch semantics that distinguish omitted fields from a nullable clear.

The domain object must not import NestJS, TypeORM, HTTP, R2 SDK types or JWT classes. The existing
TypeORM `Profile` class remains the persistence model and is mapped at the infrastructure boundary;
do not move it into `libs/`.

### Domain policy and invariants

- A User has at most one Profile; the database unique `profiles.user_id` constraint is retained.
- Lazy creation is allowed only for the owner's first read/update as defined by the spec. A public
  read does not create a Profile for an unrelated user.
- Initialization uses the official provisioned `họ tên` supplied by the approved provisioning
  boundary. No fabricated fallback name is allowed.
- `displayName` is trimmed, preserves Unicode and is limited to 100 characters.
- `bio` is optional, trimmed at the boundaries, preserves Unicode and is limited to 1,000
  characters. It may be explicitly cleared with `null`.
- Only `displayName`, avatar reference and `bio` are writable Profile fields. Email, MSSV, roles,
  permissions, account status, password and provider identifiers are not part of the Profile
  aggregate.
- A public Profile for `LOCKED` or `PENDING` accounts is represented by a generic unavailable
  result; the status itself is never returned.
- Profile changes never issue, rotate or revoke Authentication tokens and never mutate Learning,
  Submission or Community state.

### Ports

Introduce only real seams in the Profile feature:

| Port                     | Layer              | Responsibility                                                                                                                                                                          |
| ------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProfileRepository`      | Application/domain | Find a Profile, atomically initialize one from an official name, and persist explicit allowed-field updates                                                                             |
| `IdentityProfileContext` | Application        | Read the current User identity, official provisioned name, account status and roles through the existing Identity account boundary; do not create a second unrestricted User repository |
| `AvatarStorage`          | Application        | Issue an upload intent, validate an approved R2 reference, create a short-lived signed read URL, and schedule old-object cleanup                                                        |

If ID-001 exposes a compatible account-read port, `IdentityProfileContext` must reuse it. Extend
that port only for the official provisioned name if the existing provisioning contract has no
separate read seam. Do not import an Auth use case or TypeORM repository into Profile application
code.

## Application / Use Cases

Create only the operations required by the Approved spec. Each use case receives an authenticated
identity or public target ID, coordinates ports, and returns a safe response model.

### `GetMyProfile`

- **Actor:** authenticated Student, Lecturer or Admin acting as self.
- **Input:** authenticated User ID from the ID-001 context; no caller-supplied `userId`.
- **Flow:** read the User/official name, atomically find-or-create the Profile, then map the result
  to the own-profile response. Concurrent first requests converge on one Profile.
- **Output:** `userId`, Profile-owned fields and a signed avatar URL when an approved avatar exists;
  no credentials, provider data, roles or account status.
- **Errors:** unauthenticated, missing usable official name, or normalized persistence failure.

### `UpdateMyProfile`

- **Actor:** authenticated owner.
- **Input:** authenticated User ID and an explicit partial patch.
- **Flow:** allowlist the three Profile fields, normalize/validate values, validate an avatar
  reference through `AvatarStorage`, atomically initialize a missing Profile from the official
  name, persist the update, and schedule replacement-object cleanup only after a successful commit.
- **Output:** resulting own-profile response with unchanged omitted fields.
- **Errors:** invalid data/R2 reference, missing official name, or unauthorized context. A storage
  dependency failure must not leave a dangling committed Profile reference.

### `GetPublicProfile`

- **Actor:** unauthenticated visitor or any authenticated caller requesting the public view.
- **Input:** stable Identity `userId` path parameter.
- **Flow:** load the target User status and Profile without creating a missing Profile. Return a
  generic unavailable/not-found result for absent, `LOCKED` or `PENDING` public profiles. For an
  available Profile, map only `displayName`, signed avatar URL and `bio`.
- **Errors:** generic 404 for unavailable targets; no account-status or private-field leakage.

### `AdminGetUserProfile` / `AdminUpdateUserProfile`

- **Actor:** `ADMIN` only, based on the approved RBAC capability from ID-003.
- **Input:** target `userId` and the same explicit Profile patch/response shape as the owner flow.
- **Flow:** enforce the Admin capability at the application boundary, then use the same Profile
  repository and allowlist rules. These operations may manage an existing target Profile but do not
  change account or authorization data.
- **Output:** safe Profile-owned response; no private account fields. A missing target/Profile uses
  the existing not-found convention rather than silently inventing lifecycle behavior not approved
  by the spec.

### Supporting avatar upload intent

To satisfy the approved R2 boundary without accepting arbitrary URLs, add a narrowly scoped
authenticated operation such as `POST /api/profile/me/avatar/upload-url`. It issues a server-created
object key and short-lived presigned upload URL; the client then uploads directly to R2 and submits
the opaque reference through the approved Profile update operation. This is an infrastructure
support operation, not a separate avatar-management feature. Its exact DTO naming follows the
existing API convention during implementation.

## Persistence

All Profile persistence remains in `bkpractice_identity`.

- `ProfileRepository` uses the existing `profiles` table and the local User relation only.
- Keep the physical `avatar_url` column for compatibility, but store a stable server-approved R2
  object reference/key there, never a presigned URL or arbitrary external URL. The domain/property
  name may be changed to `avatarReference` while retaining the physical column name in the first
  migration-safe increment.
- Generate signed read URLs at response time through `AvatarStorage`; never persist those URLs.
- Use a transaction or an `INSERT ... ON CONFLICT (user_id) DO NOTHING` plus re-read strategy for
  lazy initialization. The unique constraint is the final concurrency guard.
- Updates use explicit field assignments, not request-body/entity spreading. The old avatar
  reference is captured and cleanup is scheduled only after the Profile transaction commits.
- Public reads do not create rows. Owner initialization may create one row seeded from the official
  provisioned name. Admin operations do not add a new lazy lifecycle rule.

## Database Changes

The baseline already contains the required Profile table, one-to-one User relation and `display_name`
length. No new Profile table or cross-service relation is needed.

The implementation migration should:

1. Preflight existing Profile rows for invalid `display_name` length/blank values and legacy
   `avatar_url` values that are not approved R2 references. Fail with an actionable remediation
   message; do not silently rewrite user data.
2. Add a named PostgreSQL check constraint for `bio IS NULL OR char_length(bio) <= 1000`.
3. Add a named check for a non-blank trimmed `display_name` if existing data passes the preflight.
4. Retain `profiles.user_id` uniqueness, the User foreign key and cascade behavior.

No `studentCode`, email, class, faculty, role, status, progress, submission or Community column is
added. No cross-service foreign key or TypeORM relation is introduced.

## Migration

Create one Identity-owned TypeORM migration, conceptually
`AddProfileValidationConstraints`, without editing `1700000000000-InitialIdentitySchema.ts`.

### Up

- Run the data preflight before adding constraints.
- Add the named Bio/display-name checks.
- Keep the migration idempotent according to the repository's TypeORM convention.

### Down

- Drop only the named checks in reverse order.
- Do not drop or recreate the existing Profile table.

Validate the migration against an isolated Identity PostgreSQL database with run, schema
inspection, revert and run-again checks. If production data fails preflight, stop and report rather
than truncating or deleting profile values.

## API

Preserve the conceptual operations approved in `spec.md`; exact controller naming follows the
existing Identity/Gateway convention.

| Operation                                 | Authentication            | Application operation                                     | Response policy                                                                                    |
| ----------------------------------------- | ------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `GET /api/profile/me`                     | Bearer access token       | `GetMyProfile`                                            | Own-profile safe response with `userId`, Profile fields and generated signed avatar URL            |
| `PATCH /api/profile/me`                   | Bearer access token       | `UpdateMyProfile`                                         | Resulting safe own-profile response                                                                |
| `GET /api/users/:userId/profile`          | Public                    | `GetPublicProfile`                                        | Exactly `displayName`, avatar URL and `bio`; generic unavailable result for missing/LOCKED/PENDING |
| `GET /api/users/:userId/profile` by Admin | Bearer + Admin capability | `AdminGetUserProfile`                                     | Safe Profile-owned response only                                                                   |
| `PATCH /api/users/:userId/profile`        | Bearer + Admin capability | `AdminUpdateUserProfile`                                  | Resulting safe Profile-owned response                                                              |
| `POST /api/profile/me/avatar/upload-url`  | Bearer access token       | `CreateAvatarUploadIntent` (supporting adapter operation) | Short-lived presigned upload URL and opaque approved object reference                              |

The controller performs transport parsing, DTO validation, use-case invocation and response/error
mapping only. It does not access TypeORM, R2 or account repositories directly. Public and private
response DTOs are separate allowlists even when they currently contain similar Profile fields.

## DTO / Validation

Create presentation DTOs according to the repository naming convention:

- `UpdateMyProfileRequestDto`: optional `displayName`, optional avatar reference/clear, optional
  `bio`/`null`; unknown fields are rejected by the existing global pipe.
- `ProfileResponseDto`: own/Admin safe representation, including stable `userId` but excluding
  credentials, provider data and authorization internals.
- `PublicProfileResponseDto`: exactly `displayName`, avatar signed URL/reference and `bio`.
- `CreateAvatarUploadIntentRequestDto`/response: only server-validated content metadata needed to
  issue a presigned upload; no caller-controlled bucket, key, credential or redirect.

Validation responsibilities:

- `class-validator`/global `ValidationPipe` handles transport shape, string type, nullability,
  unknown-field rejection and maximum lengths (`displayName` 100, `bio` 1,000).
- The application/domain layer trims values, preserves Unicode, rejects empty display names and
  enforces explicit omitted-versus-null patch semantics.
- `AvatarStorage` validates that a reference was issued for the authenticated User, matches the
  approved R2 object-key format and is not an external URL or path traversal payload.
- DTOs must not contain email, MSSV, role, permission, account-status, password, provider or
  arbitrary URL fields.

## Authorization

- Reuse the verified ID-001 authenticated identity context. Do not build a second authentication
  or JWT system in Profile.
- Students and Lecturers may read/update only their own Profile-owned fields.
- Admin operations require the approved Admin role/permission capability from ID-003. ID-002 does
  not implement RBAC or a permission-management UI.
- A public GET returns only the public representation and does not require a token. Locked/Pending
  visibility is handled as a generic unavailable result, not as an exposed status check.
- Gateway-derived identity/role metadata must not be accepted from caller-supplied headers. The
  existing Gateway middleware strips spoofed identity headers; Identity-side protected handlers
  reuse the ID-001 defense-in-depth verification/context.
- Profile authorization never grants access to courses, classes, progress, submissions or
  Community moderation.

## Messaging / Events

N/A. ID-002 has no approved asynchronous business event and does not need RabbitMQ. Avatar cleanup
is an adapter/storage concern and must not create a new event topology merely for architectural
symmetry.

## Realtime

N/A. Profile reads/updates do not require Socket.IO or Redis fan-out. Signed URL generation and
cleanup are storage operations, not realtime state.

## Infrastructure Adapters

### TypeORM Profile adapter

Implement the `ProfileRepository` adapter under the Identity Profile infrastructure module. It owns
query builders, transactions, conflict handling and mapping between the existing TypeORM model and
the domain object. It must not import another service's datasource/entity.

### Identity context adapter

Reuse the ID-001 account read boundary for User existence, official provisioned name, status and
roles. If the provisioning/import feature has not yet exposed official name persistence, keep the
adapter explicit about that prerequisite and fail the initialization path with the existing data
error; do not fabricate a name or duplicate the Excel import workflow in ID-002.

### Cloudflare R2 adapter

Add an `AvatarStorage` implementation backed by the Cloudflare R2 S3-compatible API. The adapter
must:

- use validated server-side `R2_*` configuration and never return credentials;
- generate server-owned keys under a per-user avatar prefix;
- issue short-lived presigned upload URLs with bounded content type/size;
- validate completion references against the user/prefix and approved bucket;
- generate short-lived signed GET URLs for public/own responses;
- schedule old-object deletion asynchronously after a configured grace period, without making a
  successful Profile transaction depend on cleanup completion;
- reject direct external URLs and caller-supplied bucket/key/command values.

The current package does not contain an R2 SDK. Dependency selection (normally the AWS SDK's S3
client/presigner or an already approved equivalent) is an implementation-time dependency review;
this documentation phase installs nothing and does not modify `package.json` or the lockfile.

### Configuration

Extend the Identity environment validation only during implementation with required, fail-fast R2
settings, for example endpoint/account, bucket, access key, secret, signed-URL TTL, upload size and
allowed content types. Exact variable names must follow the repository's existing configuration
style and must be added to `.env.example` without real credentials.

## Error Handling

Reuse the existing NestJS/Gateway error envelope and request/correlation-ID behavior.

| Domain/application condition                                          | Transport mapping                                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Missing/invalid authentication for private operation                  | Existing 401 convention                                                |
| Non-Admin cross-user update                                           | 403; no state change                                                   |
| Lecturer/Student cross-user update                                    | 403; no state change                                                   |
| Missing user/Profile or public `LOCKED`/`PENDING` target              | Generic 404/unavailable result without status disclosure               |
| Invalid field, protected field, unknown field or invalid R2 reference | Existing validation/400 or forbidden-field convention; no state change |
| Missing usable official provisioned name                              | Existing Identity data error; no empty Profile created                 |
| R2 unavailable during upload/reference validation/read URL generation | Existing normalized dependency error; no dangling Profile reference    |
| Persistence/unique-race failure                                       | Existing normalized persistence error; safe retry where applicable     |

Do not add a Profile-specific error envelope. Do not log raw request bodies, passwords, bearer
tokens, R2 credentials or signed URLs.

## Security

| Approved security requirement            | Enforcement location                                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ID-002-SR-001 Ownership                  | Gateway/Identity auth context plus application actor policy; repository never chooses actor identity from request body |
| ID-002-SR-002 Mass-assignment protection | Request DTO allowlist and explicit application field assignment                                                        |
| ID-002-SR-003 Controlled account data    | Separate domain model and response DTOs; Profile repository has no account-field update method                         |
| ID-002-SR-004 Public privacy             | `PublicProfileResponseDto`, public mapper and generic unavailable status handling                                      |
| ID-002-SR-005 Avatar integrity           | R2 adapter-issued object keys, per-user prefix validation and no external URL persistence                              |
| ID-002-SR-006 Input safety               | Global class-validator pipe plus domain normalization/invariants                                                       |
| ID-002-SR-007 Safe logging               | Existing request-ID logging with explicit redaction; no credential/token/R2-secret logging                             |
| ID-002-SR-008 Service isolation          | Identity-only datasource/repository; no Learning, Submission or Community DB access                                    |

The signed URL must be short-lived and generated only for an approved object. The database stores
the stable object reference, not a usable public URL. R2 cleanup is asynchronous and must not make
the Profile update transaction roll back.

## Testing Strategy

Tests must trace to the Approved acceptance criteria and preserve existing ID-001 behavior.

### Unit tests

- Domain validation for display-name 100-character boundary, bio 1,000-character boundary,
  trimming, Unicode preservation, explicit nullable clears and omitted patch fields.
- Allowed-field policy rejects email, MSSV, role, permission, status, password, provider and
  unknown fields.
- Public visibility policy hides `LOCKED`/`PENDING` status and produces only the public field set.
- Lazy initialization requires an official name and is idempotent at the use-case boundary.

### Application tests

- `GetMyProfile` creates one Profile from the official name on first read and returns it on retries.
- `UpdateMyProfile` updates only supplied fields, preserves omitted fields and supports avatar/bio
  clears without deleting the User.
- Student/Lecturer owner access succeeds; cross-user updates are forbidden.
- Admin target read/update succeeds only with the approved Admin capability and still cannot mutate
  controlled account fields.
- Public reads return the exact whitelist, generic missing/unavailable behavior and signed avatar
  URL mapping.
- R2 validation failure leaves Profile state unchanged; old-avatar cleanup is scheduled only after
  commit and does not fail the update.

### Persistence/integration tests

- Existing Profile schema preserves one-to-one uniqueness, local User cascade and nullable fields.
- Migration adds/reverts the named checks and rejects invalid pre-existing data without truncation.
- Concurrent first reads/updates produce at most one Profile and equivalent successful responses.
- Profile repository never issues SQL against another service database.

### API/Gateway tests

- Private `/api/profile/me` requires a valid Bearer token.
- Only the exact public `GET /api/users/:userId/profile` shape bypasses Gateway authentication;
  `PATCH`, upload-intent and other `/api/users`/`/api/profile` paths remain protected.
- DTO whitelist rejects protected/unknown fields and responses never include password/hash, email,
  MSSV, roles, permissions, status, refresh or provider data.
- Public locked/pending responses do not reveal account status.
- Swagger documents the approved profile operations and does not expose internal persistence fields.

### Security/logging tests

- Mass-assignment and spoofed identity-header attempts fail.
- Arbitrary external avatar URLs, caller-controlled R2 keys/buckets and path traversal references
  are rejected.
- Log/error capture confirms no password, token, signed URL, R2 credential or sensitive account
  field is emitted.

## Observability

- Reuse `RequestIdMiddleware`/correlation IDs and existing normalized error logging.
- Record operation, target service, actor category and outcome; never record profile secrets,
  access/refresh credentials, signed URLs or R2 credentials.
- Add bounded operational metrics only if the existing metrics convention exists; useful signals
  are Profile initialization conflicts, validation failures, R2 dependency failures and cleanup
  failures. Do not add a new metrics stack for ID-002.

## Requirement Traceability

| Requirement       | Implementation path                                                                     | Primary verification                   |
| ----------------- | --------------------------------------------------------------------------------------- | -------------------------------------- |
| ID-002-FR-001     | Existing unique `profiles.user_id` + `ProfileRepository`                                | Schema/integration tests; AC-012       |
| ID-002-FR-002     | `GetMyProfile`/`UpdateMyProfile` atomic initialization + Identity context official name | Application tests; AC-002              |
| ID-002-FR-003     | `GetMyProfile` + protected controller route                                             | API tests; AC-001                      |
| ID-002-FR-004–005 | Explicit patch DTO, domain policy and update use case                                   | Unit/API tests; AC-003–004             |
| ID-002-FR-006     | Profile aggregate allowlist and repository update API                                   | Security/API tests; AC-006             |
| ID-002-FR-007–009 | `GetPublicProfile` + public mapper + Gateway narrow route                               | API/privacy tests; AC-008–009          |
| ID-002-FR-010–011 | Admin capability policy and owner-only Lecturer/Student policy                          | Authorization tests; AC-010–011        |
| ID-002-FR-012–013 | `AvatarStorage` R2 adapter, upload intent and validation                                | R2/API tests; AC-005, AC-013, AC-013a  |
| ID-002-FR-014     | Identity-only domain/entity/repository boundary                                         | Architecture/integration tests; AC-014 |
| ID-002-FR-015     | Unique constraint plus transactional find-or-create                                     | Concurrency tests; AC-012              |
| ID-002-FR-016     | Nullable patch semantics and User aggregate isolation                                   | Application/API tests; AC-004          |

| Security requirement | Enforcement/test path                                                          |
| -------------------- | ------------------------------------------------------------------------------ |
| ID-002-SR-001–003    | Auth context, Admin policy, field allowlists and controlled response DTO tests |
| ID-002-SR-004–005    | Public mapper, generic unavailable result and R2 object-reference tests        |
| ID-002-SR-006–007    | Validation/serialization and redacted-log tests                                |
| ID-002-SR-008        | Datasource/repository dependency review and SQL integration tests              |

## Expected File Changes

These are implementation-time changes only; no file below is created or modified in this planning
phase.

### REUSE

- `apps/identity-service/src/modules/users/entities/profile.entity.ts` as the existing Profile
  persistence model, retaining its local User relation and physical `avatar_url` column.
- `apps/identity-service/src/modules/users/entities/user.entity.ts` for the existing User relation
  and account-status vocabulary, plus the ID-001 authenticated identity/account read boundary.
- `apps/identity-service/src/modules/identity.entities.ts`
- `apps/identity-service/src/database/data-source.ts`
- `libs/common/src/bootstrap.ts`
- `apps/api-gateway/src/proxy/gateway-proxy.service.ts` for existing Identity route forwarding.

### MODIFY

- `apps/identity-service/src/modules/users/entities/profile.entity.ts`: expose the stored avatar
  value as a stable R2 reference/key and preserve the existing schema mapping.
- `apps/identity-service/src/identity-service.module.ts`: import the Profile feature module and
  bind its adapters in the composition root.
- `libs/config/src/environment.ts`: validate required Identity R2 settings during implementation.
- `.env.example`: document R2 endpoint/bucket/credential placeholders, URL TTL and upload limits
  without real secrets.
- `apps/api-gateway/src/auth/gateway-auth.middleware.ts`: allow only the exact public Profile GET
  route without a token; keep all private Profile/User operations protected.
- `apps/api-gateway/src/proxy/gateway-proxy.service.ts`: modify only if response/header behavior is
  needed for signed avatar URLs; existing route prefixes should otherwise be reused unchanged.

### CREATE

- `apps/identity-service/src/modules/profiles/profile.module.ts`
- `apps/identity-service/src/modules/profiles/domain/` — Profile value/object policy, invariants
  and framework-independent errors.
- `apps/identity-service/src/modules/profiles/application/ports/` — ProfileRepository,
  IdentityProfileContext and AvatarStorage ports.
- `apps/identity-service/src/modules/profiles/application/use-cases/` — own-profile read/update,
  public-profile read, Admin target operations and the supporting avatar upload-intent operation.
- `apps/identity-service/src/modules/profiles/infrastructure/persistence/` — TypeORM repository
  adapter and persistence/domain mapper.
- `apps/identity-service/src/modules/profiles/infrastructure/storage/` — Cloudflare R2 adapter.
- `apps/identity-service/src/modules/profiles/presentation/` — controller, DTOs, response mappers
  and the existing authenticated-context integration.
- `apps/identity-service/src/database/migrations/*-AddProfileValidationConstraints.ts`
- Focused Profile unit, application, persistence, R2 adapter and API/Gateway tests under the
  repository's established test convention.

### REMOVE

None. ID-002 does not remove or replace the ID-001 Auth controller/service, User entity, or
Authentication DTOs.

## Implementation Order

1. Reconfirm the Approved ID-002 spec, Identity architecture and ID-001 authenticated-context
   contract; verify the provisioning boundary can supply the official name.
2. Add the Profile domain object, invariants, policy errors and the three real ports.
3. Adapt the existing Profile persistence model/property semantics without changing ownership;
   retain the physical `avatar_url` column as a stable R2 reference column.
4. Implement the Profile TypeORM repository and atomic lazy-initialization/update behavior.
5. Add and validate the Identity migration for Profile checks; inspect SQL and run isolated
   migration/revert tests.
6. Add R2 configuration and the `AvatarStorage` adapter, including upload-intent, signed-read and
   post-commit cleanup behavior. Add only the SDK dependency confirmed necessary by implementation.
7. Implement `GetMyProfile`, `UpdateMyProfile`, `GetPublicProfile` and Admin target operations.
8. Add DTOs, response mappers, Profile controller and Identity module composition-root wiring.
9. Align Gateway public-profile matching while keeping all other Profile/User routes protected;
   verify the existing proxy route remains unchanged.
10. Add unit, application, persistence, R2-adapter, API/Gateway and security tests.
11. Update Identity Swagger and `.env.example` for the approved API/configuration contract.
12. Run the relevant pnpm validation commands and verify every FR, SR and AC against this spec.

## Dependencies

- **ID-001 Authentication:** prerequisite for verified authenticated identity, account status,
  User IDs and the `/auth/me` context. Profile must not duplicate its token/session logic.
- **ID-003 RBAC:** supplies the approved Admin capability used by cross-user Profile operations;
  ID-002 consumes it but does not implement RBAC.
- **Provisioning/import contract:** must expose the official imported `họ tên` for lazy Profile
  initialization. Excel parsing and student provisioning remain outside ID-002.
- **Cloudflare R2 configuration/credentials:** required for upload intent, approved-reference
  validation and signed read URLs. R2 remains an external adapter, not an Identity database.
- **API Gateway:** existing Identity route forwarding is reused; only the exact public-profile
  authentication metadata needs alignment.

## Risks

- **Missing official name source:** the current `User` entity does not yet expose the imported
  official name. Without the approved provisioning read contract, AC-002 cannot be verified; stop
  that path rather than fabricate a display name or implement Excel import here.
- **Legacy avatar values:** existing `avatar_url` data may be external URLs. Migration preflight
  must fail safely and require remediation instead of exposing or silently rewriting them.
- **R2 orphan cleanup:** asynchronous cleanup can leave temporary orphan objects after a worker
  crash. Configure a bounded grace/lifecycle policy and monitor cleanup failures; do not block
  Profile updates on best-effort deletion.
- **Public status leakage:** all missing, locked and pending public targets must use the same generic
  unavailable response.
- **Gateway bypass errors:** allowing `/api/users` or `/api/profile` broadly would expose private
  operations. Keep the public matcher exact and covered by tests.
- **RBAC sequencing:** Admin operations cannot be verified until the approved ID-003 capability is
  available; owner/public operations remain independently testable.
- **Schema compatibility:** converting the existing `bio text` column is unnecessary; use an
  application invariant plus a named check migration so existing data is not truncated.

## Architecture Compliance

- Profile is implemented inside Identity's domain-oriented feature module; no Profile Service is
  created and no User/Profile entity is moved to `libs/`.
- Presentation handles HTTP/DTO/Swagger concerns only and invokes one application operation per
  request. It contains no TypeORM, R2 SDK or account business rules.
- Application use cases coordinate ProfileRepository, IdentityProfileContext and AvatarStorage ports
  and enforce actor/field policy through domain/application services.
- Domain code is framework-independent and owns Profile invariants, patch semantics and visibility
  policy. It does not import NestJS, TypeORM, JWT, Redis, HTTP or R2 implementations.
- Infrastructure owns TypeORM mapping, transactions, R2 presigning/signed URLs and cleanup
  adapters. The Nest composition root binds ports to concrete adapters.
- Existing Gateway behavior remains edge infrastructure: it routes, verifies access tokens and
  marks only the exact public Profile GET as unauthenticated. It does not query Identity or contain
  Profile business logic.
- Identity writes only `bkpractice_identity`; there are no cross-service SQL queries, foreign keys,
  repositories or shared business entities. `className`, learning progress, submission history and
  Community data remain outside this plan.
- The plan introduces no RabbitMQ event, Redis business state, CQRS, Event Sourcing, new identity
  provider or social-profile feature. Every proposed file and adapter traces to an Approved
  ID-002 requirement or a documented technical boundary.

> `plan.md` describes HOW. It must remain subordinate to the Approved `spec.md`; implementation
> tasks are intentionally deferred to the next SDD phase.
