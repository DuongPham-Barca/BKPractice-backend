# ID-001 Authentication Implementation Tasks

## Status

Approved — Ready for Implementation

Approved by the human product owner on `2026-09-01`.

Related spec: [`./spec.md`](./spec.md) — Approved revision `1.0`  
Related plan: [`./plan.md`](./plan.md) — Approved on `2026-09-01`

All implementation and verification tasks start incomplete. Complete them in order unless an
explicit dependency permits parallel work. Mark a task complete only after its behavior and listed
verification are both satisfied.

## Preparation

- [ ] **ID-001-T001 — Reconfirm the implementation baseline.** Inspect the current Git state,
      Identity Auth/User/RBAC modules, Gateway auth/proxy/throttler, TypeORM datasource and initial
      migration, configuration/contracts libraries, and existing tests. Confirm both source
      artifacts remain Approved and record any new conflict before changing code.  
      **Depends on:** None.  
      **Trace:** SDD preparation and Definition of Done.

- [ ] **ID-001-T002 — Add approved dependencies, configuration, and technical contracts.** Add only
      `@azure/msal-node` with pnpm; add validated Identity Microsoft/Redis settings and Gateway auth
      rate-limit settings; add the shared technical access/refresh claim types without moving an
      Identity domain model into `libs/`. Preserve real secrets outside source control and fail
      fast for required Identity configuration.  
      **Depends on:** ID-001-T001.  
      **Trace:** ID-001-FR-007, ID-001-FR-012, ID-001-FR-014;
      ID-001-SR-007, ID-001-SR-010, ID-001-SR-014.

## Domain

- [ ] **ID-001-T003 — Add the Authentication domain model and application ports.** Define the
      framework-independent authentication account projections, reuse the existing account-status
      vocabulary, define Microsoft identity and refresh-family types/invariants, define stable
      authentication error categories, and add only the seven ports approved by the plan:
      account, external identity, refresh session, password hasher, BK token service, Microsoft
      provider, and auth-flow store.  
      **Depends on:** ID-001-T001.  
      **Trace:** ID-001-FR-002, ID-001-FR-008–ID-001-FR-010,
      ID-001-FR-020–ID-001-FR-021, ID-001-FR-023, ID-001-FR-026;
      ID-001-SR-006, ID-001-SR-011, ID-001-SR-013, ID-001-SR-018.

- [ ] **ID-001-T004 — Test domain invariants and errors.** Cover `ACTIVE` token eligibility,
      `LOCKED/PENDING` denial, Microsoft link uniqueness semantics, family isolation, and ensure
      domain outputs/errors contain no credentials, provider tokens, or infrastructure types.  
      **Depends on:** ID-001-T003.  
      **Trace:** ID-001-AC-010, ID-001-AC-017, ID-001-AC-021–ID-001-AC-022.

## Persistence

- [ ] **ID-001-T005 — Extend the User persistence model for provisioned identity data.** Add
      nullable `student_id` for legacy compatibility, retain the current `email` column as the
      normalized persisted `emailTruong`, and expose password hash only through the credential
      projection used by local login. Do not add Excel parsing, class ownership, or first-login
      password-change state.  
      **Depends on:** ID-001-T003.  
      **Trace:** ID-001-FR-002–ID-001-FR-004, ID-001-FR-008, ID-001-FR-020,
      ID-001-FR-022; ID-001-AC-019, ID-001-AC-024.

- [ ] **ID-001-T006 — Add Microsoft external-identity persistence.** Create the Identity-owned
      TypeORM persistence model and entity registration for provider, tenant ID, subject/object ID,
      username at link, timestamps, local User foreign key, and the approved unique constraints.
      Do not create cross-service relations.  
      **Depends on:** ID-001-T003, ID-001-T005.  
      **Trace:** ID-001-FR-006–ID-001-FR-009; ID-001-SR-004, ID-001-SR-006;
      ID-001-AC-005–ID-001-AC-009.

- [ ] **ID-001-T007 — Extend refresh-token persistence for session families.** Add non-null-after-
      backfill `family_id` and nullable replacement lineage while retaining token hash, expiration,
      revocation, and user ownership. Do not add device fingerprints, a session dashboard, or raw
      refresh-token storage.  
      **Depends on:** ID-001-T003.  
      **Trace:** ID-001-FR-015–ID-001-FR-018, ID-001-FR-023, ID-001-FR-026;
      ID-001-SR-008, ID-001-SR-018.

- [ ] **ID-001-T008 — Implement the TypeORM authentication-account adapter.** Query by normalized
      MSSV, normalized university email, and user ID; load current roles/status; select
      `password_hash` only for local credential verification; reject ambiguous matches; never read
      another service database.  
      **Depends on:** ID-001-T005.  
      **Trace:** ID-001-FR-002–ID-001-FR-005, ID-001-FR-008, ID-001-FR-010,
      ID-001-FR-025; ID-001-SR-012–ID-001-SR-013.

- [ ] **ID-001-T009 — Implement the TypeORM external-identity adapter.** Resolve established links
      by provider `MICROSOFT + tenantId + oid`; perform first-email matching and link creation in an
      atomic transaction; convert uniqueness races into the approved safe conflict; never create a
      User.  
      **Depends on:** ID-001-T006, ID-001-T008.  
      **Trace:** ID-001-FR-007–ID-001-FR-009; ID-001-SR-004, ID-001-SR-006;
      ID-001-AC-005–ID-001-AC-009.

- [ ] **ID-001-T010 — Implement the TypeORM refresh-session adapter.** Support new-family creation,
      token lookup, transactional single-winner rotation, replacement insertion, idempotent family
      revocation, and family-only replay containment using conditional update/locking. Never store
      a usable raw bearer token.  
      **Depends on:** ID-001-T007.  
      **Trace:** ID-001-FR-015–ID-001-FR-018, ID-001-FR-023, ID-001-FR-026;
      ID-001-SR-008, ID-001-SR-018; ID-001-AC-012–ID-001-AC-014,
      ID-001-AC-021–ID-001-AC-022.

## Database / Migration

- [ ] **ID-001-T011 — Create the Identity TypeORM migration.** Add the case-insensitive email
      duplicate preflight, nullable `users.student_id` and partial unique index, functional unique
      `LOWER(email)` index, `external_identities` with local constraints, refresh family/lineage
      columns, unique family backfill for existing rows, final non-null/index enforcement, and a
      reverse-order down migration. Do not edit the baseline migration or enable synchronization.  
      **Depends on:** ID-001-T005–ID-001-T007.  
      **Trace:** Plan Database Changes/Migration; ID-001-FR-008–ID-001-FR-009,
      ID-001-FR-016, ID-001-FR-023, ID-001-FR-026.

- [ ] **ID-001-T012 — Add migration and repository integration tests.** Verify schema constraints,
      case-insensitive duplicate rejection, legacy refresh-family backfill, atomic Microsoft first
      link, single-winner refresh rotation, replay containment, and preservation of independent
      families against an isolated Identity PostgreSQL database.  
      **Depends on:** ID-001-T008–ID-001-T011.  
      **Trace:** ID-001-AC-005, ID-001-AC-008, ID-001-AC-012,
      ID-001-AC-021–ID-001-AC-022, ID-001-AC-024.

## Infrastructure

- [ ] **ID-001-T013 — Implement the Argon2 password adapter.** Reuse the installed Argon2 library
      behind `PasswordHasher` for safe hash/verify operations, provide the fixed valid dummy-hash
      path required for unknown MSSV timing resistance, and guarantee no password/hash escapes the
      adapter/application response or safe logs.  
      **Depends on:** ID-001-T003.  
      **Trace:** ID-001-FR-005, ID-001-FR-020, ID-001-FR-022;
      ID-001-SR-001, ID-001-SR-002, ID-001-SR-003, ID-001-SR-012; ID-001-AC-003,
      ID-001-AC-017, ID-001-AC-019.

- [ ] **ID-001-T014 — Implement the BKPractice JWT adapter and token issuer.** Issue and verify
      separate access/refresh tokens using validated secrets and configurable TTLs; enforce token
      purpose, issuer/audience/integrity/expiration; use minimal access claims
      `sub, roles, type=access` and refresh claims `sub, jti, fid, type=refresh`; coordinate hashed
      refresh persistence without exposing secrets.  
      **Depends on:** ID-001-T002, ID-001-T003, ID-001-T010, ID-001-T013.  
      **Trace:** ID-001-FR-011–ID-001-FR-017, ID-001-FR-019–ID-001-FR-020,
      ID-001-FR-023; ID-001-SR-008–ID-001-SR-010, ID-001-SR-014;
      ID-001-AC-011–ID-001-AC-014.

- [ ] **ID-001-T015 — Implement the Microsoft Entra adapter.** Use tenant-specific MSAL Node
      Authorization Code Flow with PKCE; construct only configured redirect locations; validate
      provider result, tenant, audience, nonce, token purpose, lifetime, `preferred_username`,
      `tid`, and `oid`; return verified identity claims only; persist/log no provider token and make
      no Graph call.  
      **Depends on:** ID-001-T002, ID-001-T003.  
      **Trace:** ID-001-FR-006–ID-001-FR-009, ID-001-FR-014;
      ID-001-SR-004–ID-001-SR-007, ID-001-SR-009, ID-001-SR-014–ID-001-SR-015;
      ID-001-AC-005, ID-001-AC-006, ID-001-AC-007, ID-001-AC-008, ID-001-AC-009,
      ID-001-AC-017–ID-001-AC-018.

- [ ] **ID-001-T016 — Implement the Redis auth-flow adapter.** Store namespaced OAuth state,
      nonce, and PKCE metadata for 300 seconds; issue cryptographically random login codes mapped
      only to `userId` for exactly 60 seconds; atomically consume state/codes once through `GETDEL`
      or equivalent; never store a Microsoft/BKPractice bearer token.  
      **Depends on:** ID-001-T002, ID-001-T003.  
      **Trace:** ID-001-FR-024; ID-001-SR-009, ID-001-SR-015, ID-001-SR-017;
      ID-001-AC-018, ID-001-AC-020.

- [ ] **ID-001-T017 — Wire use cases and adapters in the Auth composition root.** After completing
      ID-001-T018–ID-001-T024, register all seven application use cases as Nest providers, bind the
      seven application ports to their TypeORM, Argon2, JWT, MSAL, and Redis adapters, and expose
      only the providers required by the presentation layer. Register lifecycle providers only
      where required; keep module wiring free of business behavior and duplicate abstractions.  
      **Depends on:** ID-001-T008–ID-001-T010, ID-001-T013–ID-001-T016,
      ID-001-T018–ID-001-T024.  
      **Trace:** Plan Infrastructure Adapters and Architecture Compliance.

## Application

- [ ] **ID-001-T018 — Implement `LoginWithStudentId`.** Validate the provisioned account lookup,
      execute real or dummy Argon2 verification, expose one generic failure for unknown MSSV/wrong
      password/inactive status, load current roles, and create a new independent refresh family on
      success.  
      **Depends on:** ID-001-T008, ID-001-T013–ID-001-T014.  
      **Trace:** ID-001-FR-002–ID-001-FR-005, ID-001-FR-010–ID-001-FR-012,
      ID-001-FR-020, ID-001-FR-022–ID-001-FR-023; ID-001-AC-002–ID-001-AC-004,
      ID-001-AC-010–ID-001-AC-011, ID-001-AC-019, ID-001-AC-021.

- [ ] **ID-001-T019 — Implement `StartMicrosoftLogin`.** Generate state, nonce, and PKCE data;
      persist the one-time transaction; request the configured single-tenant authorization URL;
      accept no caller identity or arbitrary redirect.  
      **Depends on:** ID-001-T015–ID-001-T016.  
      **Trace:** ID-001-FR-006–ID-001-FR-007, ID-001-FR-024;
      ID-001-SR-004–ID-001-SR-007, ID-001-SR-015–ID-001-SR-017.

- [ ] **ID-001-T020 — Implement `CompleteMicrosoftLogin`.** Atomically consume state, redeem the
      provider code with PKCE, validate verified claims, resolve stable link or atomically match
      normalized `emailTruong`, reject unmatched/ambiguous/conflicting/inactive accounts without
      creating users, and return only the fixed frontend URL with one opaque login code.  
      **Depends on:** ID-001-T008–ID-001-T009, ID-001-T015–ID-001-T016.  
      **Trace:** ID-001-FR-002, ID-001-FR-006–ID-001-FR-010, ID-001-FR-024;
      ID-001-SR-004–ID-001-SR-007, ID-001-SR-012–ID-001-SR-017;
      ID-001-AC-005–ID-001-AC-010, ID-001-AC-018, ID-001-AC-020.

- [ ] **ID-001-T021 — Implement `ExchangeMicrosoftLoginCode`.** Atomically consume one valid
      60-second code, reject late/reused codes generically, reload current status/roles, require
      `ACTIVE`, and issue a new independent BKPractice refresh family and token pair.  
      **Depends on:** ID-001-T014, ID-001-T016, ID-001-T020.  
      **Trace:** ID-001-FR-010–ID-001-FR-012, ID-001-FR-023–ID-001-FR-024;
      ID-001-SR-010, ID-001-SR-013–ID-001-SR-014, ID-001-SR-017;
      ID-001-AC-010–ID-001-AC-011, ID-001-AC-020–ID-001-AC-021.

- [ ] **ID-001-T022 — Implement `RefreshSession`.** Verify typed refresh claims/hash, reload current
      account status and roles, reject invalid/expired/revoked/unknown/reused tokens generically,
      rotate transactionally inside the same family, and revoke only the affected family on replay.  
      **Depends on:** ID-001-T008, ID-001-T010, ID-001-T014.  
      **Trace:** ID-001-FR-010, ID-001-FR-014–ID-001-FR-017, ID-001-FR-026;
      ID-001-SR-008–ID-001-SR-014, ID-001-SR-018;
      ID-001-AC-010–ID-001-AC-013, ID-001-AC-022.

- [ ] **ID-001-T023 — Implement `LogoutCurrentSession`.** Require authenticated access identity,
      verify refresh purpose and subject ownership, idempotently revoke only the submitted family,
      preserve other devices, return no session details, and do not add an access-token blacklist.  
      **Depends on:** ID-001-T010, ID-001-T014.  
      **Trace:** ID-001-FR-018–ID-001-FR-019, ID-001-FR-023;
      ID-001-SR-009–ID-001-SR-011, ID-001-SR-014; ID-001-AC-014,
      ID-001-AC-017, ID-001-AC-021.

- [ ] **ID-001-T024 — Implement `GetCurrentAuthenticatedUser`.** Resolve the authenticated user
      from the verified access subject and return exactly `userId`, `studentId`, roles, and status;
      expose no Profile, credential, session, or Microsoft-provider details.  
      **Depends on:** ID-001-T008, ID-001-T014.  
      **Trace:** ID-001-FR-013–ID-001-FR-014, ID-001-FR-020–ID-001-FR-021,
      ID-001-FR-025; ID-001-SR-009–ID-001-SR-011, ID-001-SR-014;
      ID-001-AC-015–ID-001-AC-017, ID-001-AC-023.

## API

- [ ] **ID-001-T025 — Add Authentication presentation DTOs and response allowlists.** Implement the
      approved login, Microsoft callback/exchange, refresh, token-pair/authenticated-user/current-
      user DTOs with required fields, bounded lengths, global whitelist behavior, MSSV-only trim,
      and no invented MSSV regex or caller-controlled identity/role/provider/redirect fields.  
      **Depends on:** ID-001-T003.  
      **Trace:** ID-001-FR-004, ID-001-FR-011, ID-001-FR-020–ID-001-FR-021,
      ID-001-FR-024–ID-001-FR-025; ID-001-SR-001, ID-001-SR-009–ID-001-SR-012;
      ID-001-AC-004, ID-001-AC-011, ID-001-AC-017, ID-001-AC-023.

- [ ] **ID-001-T026 — Replace the Auth controller with approved operations.** Expose only login,
      Microsoft start/callback/exchange, refresh, protected logout, and protected `/me`; invoke one
      application use case per operation; map approved responses/errors; remove public register;
      add Identity-side Bearer verification for protected auth routes and subject matching for
      logout.  
      **Depends on:** ID-001-T017–ID-001-T025.  
      **Trace:** ID-001-FR-001, ID-001-FR-003, ID-001-FR-006,
      ID-001-FR-013–ID-001-FR-018, ID-001-FR-024–ID-001-FR-025;
      ID-001-AC-001–ID-001-AC-018, ID-001-AC-020, ID-001-AC-023.

- [ ] **ID-001-T027 — Update Swagger/OpenAPI for the Authentication contract.** Document the seven
      approved operations, DTO schemas, Bearer requirements, redirects, 60-second exchange,
      success responses, and normalized public error statuses; expose no persistence/security
      fields and document no Out-of-Scope endpoint.  
      **Depends on:** ID-001-T025–ID-001-T026.  
      **Trace:** Plan API/DTO; Definition of Done API documentation.

## API Gateway Integration

- [ ] **ID-001-T028 — Align Gateway Authentication routing and trusted identity handling.** Remove
      register from the public allowlist; add exact public login/Microsoft/refresh routes; keep
      logout and `/me` protected; accept only typed valid BKPractice access tokens; continue
      removing spoofed identity/role headers and deriving trusted values from verified claims.  
      **Depends on:** ID-001-T002, ID-001-T026.  
      **Trace:** ID-001-FR-001, ID-001-FR-013–ID-001-FR-014;
      ID-001-SR-010–ID-001-SR-011, ID-001-SR-014; ID-001-AC-001,
      ID-001-AC-015–ID-001-AC-016.

- [ ] **ID-001-T029 — Forward safe OAuth redirects through the Gateway proxy.** Preserve upstream
      `Location` for approved 302 responses while continuing to drop `set-cookie` and unsafe
      headers, and ensure no bearer token appears in the redirect URL.  
      **Depends on:** ID-001-T026.  
      **Trace:** ID-001-FR-024; ID-001-SR-009, ID-001-SR-015, ID-001-SR-017;
      ID-001-AC-018, ID-001-AC-020.

- [ ] **ID-001-T030 — Add configurable path-aware authentication throttling.** Extend the existing
      Nest throttler without adding Identity business logic: retain default 120/minute, apply
      5/minute/IP to password login, and 30/minute/IP to Microsoft start/callback/exchange and
      refresh using validated configurable one-minute TTL/limits.  
      **Depends on:** ID-001-T002, ID-001-T028.  
      **Trace:** ID-001-SR-003, ID-001-SR-016.

## Messaging

- [x] **N/A — ID-001 has no approved RabbitMQ message, queue, exchange, retry, ACK/NACK, or DLQ
      behavior.** Microsoft authorization remains synchronous HTTPS through its adapter.

## Realtime

- [x] **N/A — ID-001 has no approved Socket.IO behavior.** Redis stores ephemeral OAuth state and
      one-time codes only; PostgreSQL remains the source of persistent session truth.

## Authorization and Security

- [ ] **ID-001-T031 — Implement normalized authentication error handling and safe observability.**
      Keep domain/application errors framework-independent; map validation to existing 400,
      credential/account/provider/link/refresh failures to non-enumerating generic 401 behavior,
      provider/Redis outages to safe 503, and unexpected failures to normalized 500 with request
      ID. Preserve logout idempotency and log only coarse outcomes without auth request bodies or
      sensitive values.  
      **Depends on:** ID-001-T018–ID-001-T030.  
      **Trace:** ID-001-FR-005, ID-001-FR-010, ID-001-FR-017–ID-001-FR-020;
      ID-001-SR-001, ID-001-SR-005, ID-001-SR-007, ID-001-SR-009,
      ID-001-SR-012–ID-001-SR-015; ID-001-AC-003, ID-001-AC-009–ID-001-AC-010,
      ID-001-AC-013–ID-001-AC-014, ID-001-AC-017–ID-001-AC-018.

- [ ] **ID-001-T032 — Perform focused authorization and security implementation review.** Verify
      that public input cannot create accounts, assign roles/status, link arbitrary provider IDs,
      choose redirect URLs, or inject trusted headers; only `ACTIVE` users get new tokens; protected
      operations require access purpose; refresh/provider tokens cannot access APIs; production
      transport/configuration is secure; access tokens expire naturally without a blacklist.  
      **Depends on:** ID-001-T013–ID-001-T031.  
      **Trace:** All ID-001-SR-001–ID-001-SR-018; ID-001-FR-001–ID-001-FR-026.

## Testing

- [ ] **ID-001-T033 — Add application and domain unit tests.** Test every approved use case through
      mocked/in-memory ports: student-login success/generic failure/dummy hash/status/family,
      Microsoft state and linking branches, one-time exchange, refresh rotation/replay/isolation,
      logout ownership/idempotency, and minimal `/me`; assert no unintended adapter calls after
      failures.  
      **Depends on:** ID-001-T004, ID-001-T018–ID-001-T024.  
      **Trace:** ID-001-AC-002–ID-001-AC-014, ID-001-AC-020–ID-001-AC-023.

- [ ] **ID-001-T034 — Add infrastructure adapter tests.** Test Argon2 hash/verify and dummy path,
      typed minimal JWT claims/purpose/TTL, MSAL tenant/audience/state/nonce/claim validation,
      Redis 300/60-second TTL and atomic single use, TypeORM conflict translation, and absence of
      raw credentials/provider tokens in persistence or logs.  
      **Depends on:** ID-001-T008–ID-001-T016.  
      **Trace:** ID-001-SR-001–ID-001-SR-018; ID-001-AC-003,
      ID-001-AC-005–ID-001-AC-013, ID-001-AC-017–ID-001-AC-020.

- [ ] **ID-001-T035 — Add Gateway unit/integration tests.** Cover exact public and protected paths,
      register unavailability, missing/malformed/expired/wrong-purpose token rejection, spoofed-
      header removal, trusted header derivation, path-aware limits, redirect `Location` forwarding,
      and absence of bearer tokens in redirect URLs.  
      **Depends on:** ID-001-T028–ID-001-T031.  
      **Trace:** ID-001-AC-001, ID-001-AC-015–ID-001-AC-018.

- [ ] **ID-001-T036 — Add Identity API/E2E tests.** Cover all seven approved operations and the
      grouped acceptance scenarios: no public register; MSSV login validation and generic failure;
      university-only Microsoft match/link/reuse/rejection; account statuses; minimal claims;
      refresh rotation/rejection; current-family logout; one-time code; multi-device isolation;
      replay containment; minimal `/me`; and provisioned MSSV/email mapping using fixtures rather
      than implementing Excel import.  
      **Depends on:** ID-001-T012, ID-001-T026–ID-001-T035.  
      **Trace:** All ID-001-AC-001–ID-001-AC-024.

- [ ] **ID-001-T037 — Run the Microsoft staging-tenant smoke test.** With non-committed real
      configuration, verify redirect URI/app registration, university-tenant login, first
      `emailTruong` link, stable subsequent `tid + oid` lookup, opaque-code exchange, wrong-tenant
      rejection, and provider-secret/log hygiene; record any environment-dependent unverified
      behavior.  
      **Depends on:** ID-001-T020–ID-001-T021, ID-001-T026, ID-001-T029,
      ID-001-T031, ID-001-T036.  
      **Trace:** ID-001-FR-006–ID-001-FR-009, ID-001-FR-024;
      ID-001-AC-005–ID-001-AC-009, ID-001-AC-018, ID-001-AC-020.

- [ ] **ID-001-T038 — Remove superseded legacy Authentication code after replacement tests pass.**
      Delete the public register DTO/handler, old email-login/refresh DTOs after replacements are
      wired, and monolithic `AuthService` only after equivalent approved behavior is covered; verify
      no other module imports them and no public registration path remains.  
      **Depends on:** ID-001-T033–ID-001-T036.  
      **Trace:** ID-001-FR-001; ID-001-AC-001; Plan REMOVE classification.

## Documentation

- [ ] **ID-001-T039 — Update implementation-facing authentication documentation.** Keep Swagger in
      sync; document required Microsoft/Redis/rate-limit environment variables, JSON refresh-token
      delivery, current-family logout/replay behavior, migration apply/revert warning, staging smoke
      procedure, and the accepted `123456` residual risk. Do not document Out-of-Scope features as
      available.  
      **Depends on:** ID-001-T027, ID-001-T030–ID-001-T038.  
      **Trace:** Definition of Done; Plan Observability/Risks.

## Validation

- [ ] **ID-001-T040 — Validate migration apply/revert/apply.** Against an isolated Identity
      database, run `pnpm migration:run:identity`, inspect the schema/data backfill, run
      `pnpm migration:revert:identity`, verify the down path, run the migration again, and confirm
      `synchronize` remains disabled. Record destructive revert implications and any unverified
      case.  
      **Depends on:** ID-001-T011–ID-001-T012, ID-001-T038.  
      **Trace:** Database strategy and Definition of Done.

- [ ] **ID-001-T041 — Run required repository validation.** Run `pnpm lint`, `pnpm typecheck`,
      `pnpm test`, and `pnpm build`; fix only in-scope failures, rerun until passing, and record exact
      results plus any unrelated pre-existing failure.  
      **Depends on:** ID-001-T037–ID-001-T040.  
      **Trace:** Definition of Done quality checks.

## Architecture Compliance

- [ ] **ID-001-T042 — Verify service architecture and ownership.** Confirm Presentation only
      handles transport, Application coordinates use cases, Domain has no NestJS/TypeORM/Redis/JWT/
      MSAL/HTTP dependencies, Infrastructure implements local ports, Auth module is only a
      composition root, all persistent data belongs to `bkpractice_identity`, `libs/contracts`
      contains technical claims only, and Gateway contains no Identity domain/database logic.  
      **Depends on:** ID-001-T038–ID-001-T041.  
      **Trace:** Identity architecture, dependency rules, database strategy, plan Architecture
      Compliance.

## Final Verification

- [ ] **ID-001-T043 — Verify the implementation against the Approved specification.** Review every
      ID-001-FR-001–ID-001-FR-026, ID-001-SR-001–ID-001-SR-018, and
      ID-001-AC-001–ID-001-AC-024 against code, tests, migration, Swagger, and recorded validation;
      confirm no Google/external-user login, Excel import, Change Password, MFA, OAuth broker,
      device management, blacklist, CQRS, or other Out-of-Scope behavior was added; report every
      deviation or unverified behavior.  
      **Depends on:** ID-001-T039–ID-001-T042.  
      **Trace:** Approved spec, Definition of Done, all requirements and acceptance criteria.

- [ ] **ID-001-T044 — Complete the SDD handoff.** Update every applicable checkbox honestly, retain
      justified N/A items, attach validation/migration/smoke-test evidence, obtain human review, and
      move the spec status to `Implemented` and later `Verified` only through the approved SDD
      workflow.  
      **Depends on:** ID-001-T043.  
      **Trace:** SDD workflow and Definition of Done.

## Coverage Summary

### Functional requirements

| Requirements                | Primary implementation tasks                                                            | Primary test/verification tasks                               |
| --------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| ID-001-FR-001–ID-001-FR-005 | ID-001-T005, ID-001-T008, ID-001-T013, ID-001-T018, ID-001-T026, ID-001-T028            | ID-001-T033, ID-001-T035–ID-001-T036, ID-001-T043             |
| ID-001-FR-006–ID-001-FR-010 | ID-001-T006, ID-001-T009, ID-001-T015–ID-001-T021                                       | ID-001-T033–ID-001-T034, ID-001-T036–ID-001-T037, ID-001-T043 |
| ID-001-FR-011–ID-001-FR-014 | ID-001-T002, ID-001-T014, ID-001-T018, ID-001-T021–ID-001-T022, ID-001-T028             | ID-001-T033–ID-001-T036, ID-001-T043                          |
| ID-001-FR-015–ID-001-FR-019 | ID-001-T007, ID-001-T010, ID-001-T014, ID-001-T022–ID-001-T023                          | ID-001-T012, ID-001-T033–ID-001-T036, ID-001-T043             |
| ID-001-FR-020–ID-001-FR-023 | ID-001-T005, ID-001-T013–ID-001-T014, ID-001-T018, ID-001-T021, ID-001-T023–ID-001-T025 | ID-001-T033–ID-001-T036, ID-001-T043                          |
| ID-001-FR-024–ID-001-FR-026 | ID-001-T010, ID-001-T016, ID-001-T020–ID-001-T024, ID-001-T029                          | ID-001-T012, ID-001-T033–ID-001-T037, ID-001-T043             |

### Security requirements

| Requirements                | Implementation and verification tasks                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| ID-001-SR-001–ID-001-SR-003 | ID-001-T013, ID-001-T018, ID-001-T025, ID-001-T030–ID-001-T036, ID-001-T043                                       |
| ID-001-SR-004–ID-001-SR-007 | ID-001-T002, ID-001-T006, ID-001-T009, ID-001-T015, ID-001-T019–ID-001-T020, ID-001-T031–ID-001-T037, ID-001-T043 |
| ID-001-SR-008–ID-001-SR-010 | ID-001-T007, ID-001-T010, ID-001-T014, ID-001-T016, ID-001-T022–ID-001-T026, ID-001-T031–ID-001-T036, ID-001-T043 |
| ID-001-SR-011–ID-001-SR-014 | ID-001-T003, ID-001-T008, ID-001-T014, ID-001-T018–ID-001-T026, ID-001-T028, ID-001-T031–ID-001-T036, ID-001-T043 |
| ID-001-SR-015–ID-001-SR-018 | ID-001-T010, ID-001-T015–ID-001-T016, ID-001-T019–ID-001-T023, ID-001-T029–ID-001-T037, ID-001-T043               |

### Acceptance criteria

| Acceptance criteria         | Verification tasks                                                          |
| --------------------------- | --------------------------------------------------------------------------- |
| ID-001-AC-001–ID-001-AC-004 | ID-001-T033, ID-001-T035–ID-001-T036, ID-001-T043                           |
| ID-001-AC-005–ID-001-AC-009 | ID-001-T012, ID-001-T033–ID-001-T037, ID-001-T043                           |
| ID-001-AC-010–ID-001-AC-014 | ID-001-T012, ID-001-T033–ID-001-T036, ID-001-T043                           |
| ID-001-AC-015–ID-001-AC-018 | ID-001-T034–ID-001-T037, ID-001-T043                                        |
| ID-001-AC-019–ID-001-AC-020 | ID-001-T013, ID-001-T016, ID-001-T033–ID-001-T037, ID-001-T043              |
| ID-001-AC-021–ID-001-AC-022 | ID-001-T010, ID-001-T012, ID-001-T033–ID-001-T036, ID-001-T043              |
| ID-001-AC-023–ID-001-AC-024 | ID-001-T005, ID-001-T008, ID-001-T024–ID-001-T026, ID-001-T036, ID-001-T043 |

## Definition of Done Reference

ID-001 is Done only when every applicable item in
[`specs/00-system/definition-of-done.md`](../../00-system/definition-of-done.md) is satisfied,
ID-001-T001–ID-001-T044 are completed or validly marked N/A, all validation evidence is recorded,
and the human-approved SDD workflow advances the specification status. Completion of code alone is
not sufficient.
