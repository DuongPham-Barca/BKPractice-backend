# ID-002 Profile Implementation Tasks

## Status

Approved — Ready for Implementation

Approved by the human product owner on `2026-09-01`.

Related specification: [`./spec.md`](./spec.md) — Approved revision `0.4`  
Related plan: [`./plan.md`](./plan.md) — Approved on `2026-09-01`

All implementation tasks start incomplete. Mark a task `[x]` only after the implementation and
its listed verification are complete. Tasks marked N/A are the only intentional checked items.

## Preparation / Reuse Analysis

- [ ] **ID-002-T001 — Reconfirm the implementation baseline.** Inspect Git state, the Approved
      Profile spec/plan, Identity architecture, dependency rules, current Identity entities,
      datasource, migration, module composition, Gateway auth middleware/proxy and existing tests.
      Confirm no source changes are made before implementation begins.  
      **Depends on:** None.  
      **Trace:** SDD workflow; Definition of Done.

- [ ] **ID-002-T002 — Confirm upstream Identity contracts.** Verify that ID-001 exposes the
      authenticated User ID/account-status context and that the approved provisioning boundary can
      supply the official imported `họ tên` needed for lazy initialization. Confirm the ID-003 RBAC
      boundary for Admin operations. Report a blocker instead of inventing a fallback if any
      contract is unavailable.  
      **Depends on:** ID-002-T001.  
      **Trace:** ID-002-FR-002, ID-002-FR-010–ID-002-FR-011; AC-002, AC-010–AC-011.

- [ ] **ID-002-T003 — Confirm reusable persistence and transport foundation.** Reuse the existing
      `Profile`/`User` relation, `profiles.user_id` uniqueness, Identity datasource/entity registry,
      global validation/Swagger bootstrap, Gateway Identity route prefixes and ID-001 auth context.
      Do not create a duplicate User/Profile entity, authentication system or repository hierarchy.
      **Depends on:** ID-002-T001.  
      **Trace:** Plan Existing Code Impact; ID-002-FR-001, ID-002-FR-014.

- [ ] **ID-002-T004 — Confirm service-boundary exclusions.** Record that MSSV/email, roles,
      permissions, account status, class/faculty, Learning progress, Submission history and
      Community content remain outside Profile state. Ensure no task introduces a cross-service
      foreign key, database query or shared business entity.  
      **Depends on:** ID-002-T001.  
      **Trace:** ID-002-FR-006, ID-002-FR-014; ID-002-SR-003, ID-002-SR-008; AC-006, AC-014.

## Domain

- [ ] **ID-002-T005 — Add the framework-independent Profile domain object.** Create the minimal
      Profile domain model for `profileId`, `userId`, `displayName`, nullable avatar reference and
      nullable `bio`; keep Profile behavior inside Identity and out of `libs/`.  
      **Depends on:** ID-002-T001–ID-002-T004.  
      **Trace:** Plan Domain Changes; ID-002-FR-001, ID-002-FR-005–ID-002-FR-006.

- [ ] **ID-002-T006 — Implement Profile invariants and policies.** Enforce non-empty trimmed
      `displayName` (maximum 100 characters), optional trimmed `bio` (maximum 1,000 characters),
      Unicode preservation, explicit omitted-versus-null patch semantics, editable-field allowlist,
      controlled-field rejection and generic public unavailability for `LOCKED`/`PENDING` accounts.
      Keep the policy independent of NestJS, TypeORM and R2 SDK types.  
      **Depends on:** ID-002-T005.  
      **Trace:** ID-002-FR-005–ID-002-FR-009, ID-002-FR-016; ID-002-SR-002–ID-002-SR-006;
      AC-005–AC-009, AC-008a.

- [ ] **ID-002-T007 — Test Profile domain behavior.** Add focused unit tests for text boundaries,
      trimming/Unicode, nullable clears, omitted fields, protected-field rejection and locked/pending
      public visibility.  
      **Depends on:** ID-002-T006.  
      **Trace:** ID-002-AC-004–ID-002-AC-009, ID-002-AC-008a; ID-002-SR-002–ID-002-SR-006.

## Persistence

- [ ] **ID-002-T008 — Align the existing Profile persistence model.** Reuse
      `apps/identity-service/src/modules/users/entities/profile.entity.ts`; expose the stored
      avatar value semantically as a stable R2 object reference/key while retaining the physical
      `avatar_url` column for compatibility. Preserve the one-to-one User relation, cascade behavior,
      `display_name varchar(100)` and nullable fields.  
      **Depends on:** ID-002-T003, ID-002-T006.  
      **Trace:** Plan Persistence/Database Changes; ID-002-FR-001, ID-002-FR-005, ID-002-FR-012;
      AC-003, AC-013.

- [ ] **ID-002-T009 — Define Profile persistence boundaries.** Add only the planned
      `ProfileRepository`, `IdentityProfileContext` and `AvatarStorage` ports in the Profile
      application boundary. Reuse ID-001's account-read/authenticated context when compatible;
      do not create a second unrestricted User repository or a generic base repository.  
      **Depends on:** ID-002-T002, ID-002-T005.  
      **Trace:** Plan Ports; ID-002-FR-002, ID-002-FR-010–ID-002-FR-011; ID-002-SR-001, ID-002-SR-008.

- [ ] **ID-002-T010 — Implement the TypeORM Profile repository adapter.** Implement local Profile
      lookup, atomic find-or-create from the official name, explicit allowed-field updates, domain/
      persistence mapping and safe not-found/conflict handling. Use the existing Identity datasource
      only; ensure concurrent initialization cannot create duplicate rows.  
      **Depends on:** ID-002-T008–ID-002-T009.  
      **Trace:** ID-002-FR-001–ID-002-FR-005, ID-002-FR-015–ID-002-FR-016; AC-001–AC-004, AC-012.

- [ ] **ID-002-T011 — Wire Profile persistence into Identity composition.** Register the Profile
      repository adapter and Profile entity through the Identity module/composition root without
      changing Auth behavior or moving business entities into shared libraries.  
      **Depends on:** ID-002-T008–ID-002-T010.  
      **Trace:** Plan Infrastructure Adapters and Architecture Compliance.

- [ ] **ID-002-T012 — Add Profile persistence/concurrency tests.** Verify one-to-one uniqueness,
      nullable behavior, local User ownership, retry-safe lazy initialization, concurrent first
      requests, explicit updates and absence of cross-service SQL access.  
      **Depends on:** ID-002-T010–ID-002-T011.  
      **Trace:** ID-002-AC-001–ID-002-AC-004, ID-002-AC-012, ID-002-AC-014;
      ID-002-SR-001, ID-002-SR-008.

## Database / Migration

- [ ] **ID-002-T013 — Create the Profile validation migration.** Create an Identity-owned TypeORM
      migration without editing `1700000000000-InitialIdentitySchema.ts`. Add preflight checks for
      invalid existing display names and legacy non-approved avatar values, then add named checks
      for non-blank `display_name` and `bio` length `<= 1,000`. Retain the existing User foreign key,
      cascade and unique `user_id`; do not add academic, role or cross-service columns.  
      **Depends on:** ID-002-T008.  
      **Trace:** Plan Database Changes/Migration; ID-002-FR-001, ID-002-FR-005, ID-002-FR-012;
      AC-012–AC-013.

- [ ] **ID-002-T014 — Verify migration lifecycle and compatibility.** Review generated SQL, verify
      apply/revert/re-apply against an isolated Identity PostgreSQL database, confirm existing data
      is not truncated, and keep `synchronize: false`. Stop and report actionable remediation when
      preflight data is invalid.  
      **Depends on:** ID-002-T013.  
      **Trace:** Definition of Done migration requirements; ID-002-AC-013, ID-002-AC-014.

## Infrastructure / Avatar Storage

- [ ] **ID-002-T015 — Add validated R2 configuration.** Extend Identity environment validation and
      `.env.example` with fail-fast Cloudflare R2 endpoint/bucket/credential placeholders, signed
      URL TTL, upload limits, allowed content types and cleanup grace settings. Keep real credentials
      outside source control.  
      **Depends on:** ID-002-T001, ID-002-T002.  
      **Trace:** ID-002-FR-012–ID-002-FR-013; ID-002-SR-005, ID-002-SR-007.

- [ ] **ID-002-T016 — Select and add the minimal R2 SDK dependency if required.** Inspect existing
      dependencies first; add only the approved S3-compatible R2 client/presigner through pnpm if no
      existing adapter is suitable. Do not add a new storage provider or modify dependencies merely
      for abstraction symmetry.  
      **Depends on:** ID-002-T015.  
      **Trace:** Plan Cloudflare R2 adapter; ID-002-FR-012, ID-002-SR-005.

- [ ] **ID-002-T017 — Implement the Cloudflare R2 AvatarStorage adapter.** Generate server-owned
      per-user object keys, short-lived presigned upload URLs and short-lived signed read URLs;
      validate approved references against the bucket/user prefix and reject external URLs, caller
      buckets/keys, path traversal and untrusted credentials. Never persist signed URLs.  
      **Depends on:** ID-002-T009, ID-002-T015–ID-002-T016.  
      **Trace:** ID-002-FR-012–ID-002-FR-013; ID-002-SR-005–ID-002-SR-007;
      AC-005, AC-013, AC-013a.

- [ ] **ID-002-T018 — Implement post-commit avatar cleanup behavior.** Capture replaced/cleared
      object references, update the Profile reference first, and schedule best-effort asynchronous
      deletion after the configured grace period. Cleanup failure must not roll back a successful
      Profile update and must not expose credentials or signed URLs in logs.  
      **Depends on:** ID-002-T010, ID-002-T017.  
      **Trace:** ID-002-FR-005, ID-002-FR-016; ID-002-SR-005, ID-002-SR-007;
      AC-004, AC-013b.

- [ ] **ID-002-T019 — Test the R2 adapter and cleanup boundary.** Verify upload-intent ownership,
      content restrictions, approved-reference validation, signed-read URL generation, arbitrary URL
      rejection, post-commit cleanup scheduling and dependency-failure behavior with no dangling
      Profile reference.  
      **Depends on:** ID-002-T017–ID-002-T018.  
      **Trace:** ID-002-AC-005, ID-002-AC-013, ID-002-AC-013a–ID-002-AC-013b, ID-002-AC-015;
      ID-002-SR-005–ID-002-SR-007.

## Application Use Cases

- [ ] **ID-002-T020 — Implement `GetMyProfile`.** Resolve the User ID from the verified ID-001
      authenticated context, atomically lazy-create a missing Profile from the official provisioned
      name, and return the safe own-profile representation. Do not accept a caller-supplied User ID
      or return credentials/provider/session data.  
      **Depends on:** ID-002-T002, ID-002-T006, ID-002-T010–ID-002-T011.  
      **Trace:** ID-002-FR-002–ID-002-FR-003; ID-002-SR-001, ID-002-SR-003;
      AC-001–AC-002, AC-007.

- [ ] **ID-002-T021 — Implement `UpdateMyProfile`.** Coordinate explicit partial updates for the
      owner, enforce the editable-field allowlist and domain validation, validate R2 references,
      preserve omitted fields, support avatar/bio clears, lazy-initialize when needed and schedule
      old-avatar cleanup only after commit.  
      **Depends on:** ID-002-T006, ID-002-T010–ID-002-T011, ID-002-T017–ID-002-T018.  
      **Trace:** ID-002-FR-002, ID-002-FR-004–ID-002-FR-006, ID-002-FR-016;
      ID-002-SR-001–ID-002-SR-003; AC-002–AC-006.

- [ ] **ID-002-T022 — Implement `GetPublicProfile`.** Load the target Identity User/Profile without
      creating a row for an unrelated user, return only the public allowlist, generate a signed
      avatar URL when applicable and return the same generic unavailable/not-found result for missing,
      `LOCKED` and `PENDING` targets.  
      **Depends on:** ID-002-T006, ID-002-T010, ID-002-T017.  
      **Trace:** ID-002-FR-007–ID-002-FR-009; ID-002-SR-004–ID-002-SR-005;
      AC-008–AC-009, AC-008a.

- [ ] **ID-002-T023 — Implement Admin target Profile operations.** Add `AdminGetUserProfile` and
      `AdminUpdateUserProfile` using the approved ID-003 Admin capability, the same safe response and
      explicit field allowlist, with no account/authorization mutation and no new Admin lazy-lifecycle
      rule.  
      **Depends on:** ID-002-T002, ID-002-T006, ID-002-T010–ID-002-T011.  
      **Trace:** ID-002-FR-010; ID-002-SR-001–ID-002-SR-003; AC-010.

- [ ] **ID-002-T024 — Implement `CreateAvatarUploadIntent`.** Expose the narrowly scoped owner-only
      supporting operation that returns a server-generated R2 object reference and short-lived
      presigned upload URL; accept no caller bucket, key, credential, redirect or external URL.  
      **Depends on:** ID-002-T017.  
      **Trace:** ID-002-FR-012–ID-002-FR-013; ID-002-SR-005–ID-002-SR-006;
      AC-005, AC-013.

## DTO / Mapping / Presentation

- [ ] **ID-002-T025 — Create Profile request DTOs and transport validation.** Add the planned own/
      Admin patch and avatar-upload-intent DTOs with optional fields, nullable clear semantics,
      display-name maximum 100, bio maximum 1,000, class-validator integration and rejection of
      unknown/protected fields through the existing global validation pipe.  
      **Depends on:** ID-002-T006, ID-002-T024.  
      **Trace:** ID-002-FR-005–ID-002-FR-006, ID-002-FR-013, ID-002-FR-016;
      ID-002-SR-002, ID-002-SR-006; AC-003–AC-006.

- [ ] **ID-002-T026 — Create response DTOs and explicit mappers.** Implement separate own/Admin and
      public response allowlists. Include only the stable `userId` where approved plus Profile-owned
      fields and generated signed avatar URL; exclude email, MSSV, roles, permissions, account
      status, password/hash, refresh data, provider identities and internal R2 metadata.  
      **Depends on:** ID-002-T020–ID-002-T023.  
      **Trace:** ID-002-FR-007–ID-002-FR-009; ID-002-SR-003–ID-002-SR-004;
      AC-001, AC-008–AC-009, AC-015.

- [ ] **ID-002-T027 — Implement the Profile controller and module wiring.** Add the planned Profile
      routes, invoke exactly one application operation per request, map existing Identity/Gateway
      errors, apply the reused authenticated identity context and register the feature module in the
      Identity composition root. Keep controllers free of business logic and direct database/R2 use.
      **Depends on:** ID-002-T011, ID-002-T020–ID-002-T026.  
      **Trace:** ID-002-FR-003–ID-002-FR-011; ID-002-SR-001–ID-002-SR-004;
      AC-001, AC-007, AC-010–AC-011.

- [ ] **ID-002-T028 — Update Swagger/OpenAPI documentation.** Document own/public/Admin Profile
      operations and the supporting avatar upload intent, request limits/nullability, Bearer/Admin
      requirements, signed-avatar responses and relevant 400/401/403/404/dependency errors without
      exposing persistence or credential fields.  
      **Depends on:** ID-002-T025–ID-002-T027.  
      **Trace:** Definition of Done API documentation; ID-002-AC-001, AC-008–AC-011.

## API Gateway Integration

- [ ] **ID-002-T029 — Align exact public Profile route authentication metadata.** Update Gateway auth
      matching so only `GET /api/users/:userId/profile` has public access; keep `/api/profile/me`,
      PATCH routes, Admin routes and avatar upload intent protected. Continue stripping spoofed
      identity/role headers and deriving trusted context from the verified ID-001 access token.  
      **Depends on:** ID-002-T027.  
      **Trace:** ID-002-FR-003, ID-002-FR-007, ID-002-FR-010–ID-002-FR-011;
      ID-002-SR-001, ID-002-SR-004; AC-007–AC-011.

- [ ] **ID-002-T030 — Verify Gateway proxy compatibility.** Confirm existing `/api/profile` and
      `/api/users` forwarding reaches Identity, preserves the approved response/error headers and
      does not broaden the public bypass. Modify proxy code only if the signed-avatar/API contract
      requires it.  
      **Depends on:** ID-002-T029.  
      **Trace:** Plan API Gateway integration; ID-002-SR-001, ID-002-SR-008.

## Authorization / Privacy / Error Handling

- [ ] **ID-002-T031 — Enforce actor and field authorization.** Verify owner-only Student/Lecturer
      updates, Admin-only cross-user management through the ID-003 capability, public read scope and
      generic unavailable behavior. Reject all attempts to mutate email, MSSV, roles, permissions,
      account status, password or provider fields at the application boundary, not only in DTOs.  
      **Depends on:** ID-002-T002, ID-002-T006, ID-002-T020–ID-002-T023.  
      **Trace:** ID-002-FR-006, ID-002-FR-010–ID-002-FR-011; ID-002-SR-001–ID-002-SR-004;
      AC-006, AC-008a, AC-010–AC-011.

- [ ] **ID-002-T032 — Map Profile errors to the existing convention.** Implement 400 validation,
      401 authentication, 403 ownership/field, 404 generic unavailable/not-found and normalized R2/
      persistence dependency errors without creating a new error envelope or leaking account status.
      **Depends on:** ID-002-T020–ID-002-T027.  
      **Trace:** Plan Error Handling; ID-002-FR-007, ID-002-FR-013, ID-002-SR-004;
      AC-005, AC-007, AC-008a, AC-015.

- [ ] **ID-002-T033 — Add safe logging and redaction controls.** Reuse correlation IDs and existing
      logging while ensuring passwords, access/refresh tokens, authorization headers, R2 credentials,
      signed URLs and sensitive account fields never appear in Profile logs or errors.  
      **Depends on:** ID-002-T027, ID-002-T032.  
      **Trace:** ID-002-SR-007; AC-015.

## Messaging / Realtime

- [x] **ID-002-T034 — N/A: Messaging.** ID-002 has no approved RabbitMQ business event or message
      contract; avatar cleanup remains an infrastructure concern and does not create a new topology.

- [x] **ID-002-T035 — N/A: Realtime.** Profile operations do not require Socket.IO/Redis fan-out;
      Identity persistence remains the source of truth.

## Testing

- [ ] **ID-002-T036 — Add application/use-case tests.** Cover GetMyProfile lazy initialization and
      retry behavior; UpdateMyProfile allowed/omitted/null fields; missing official name; public
      whitelist/status handling; Admin capability; Student/Lecturer cross-user denial; and User
      account preservation.  
      **Depends on:** ID-002-T020–ID-002-T023, ID-002-T031–ID-002-T032.  
      **Trace:** ID-002-AC-001–ID-002-AC-012, ID-002-AC-014; FR-002–FR-011, FR-015–FR-016.

- [ ] **ID-002-T037 — Add API/Gateway contract tests.** Verify private Bearer requirements, the
      exact public GET bypass, protected PATCH/upload/Admin routes, DTO whitelist behavior, response
      allowlists, generic locked/pending responses and existing proxy routing.  
      **Depends on:** ID-002-T025–ID-002-T030.  
      **Trace:** ID-002-AC-005–ID-002-AC-011, ID-002-AC-015; ID-002-SR-001–ID-002-SR-004.

- [ ] **ID-002-T038 — Add persistence, migration and R2 integration tests.** Verify Profile schema
      constraints, migration run/revert/re-run, invalid-data preflight, one-to-one concurrency,
      R2 reference/signed URL behavior, cleanup scheduling and dependency failure without dangling
      references.  
      **Depends on:** ID-002-T012, ID-002-T014, ID-002-T019.  
      **Trace:** ID-002-AC-005, ID-002-AC-012–ID-002-AC-015; ID-002-SR-005–ID-002-SR-008.

- [ ] **ID-002-T039 — Review security and boundary tests.** Confirm mass-assignment rejection,
      spoofed identity-header rejection, private-field non-disclosure, arbitrary R2 URL/key
      rejection, no cross-service SQL, no shared business entity and no credential/signed-URL log
      leakage.  
      **Depends on:** ID-002-T031–ID-002-T033, ID-002-T037–ID-002-T038.  
      **Trace:** ID-002-SR-001–ID-002-SR-008; AC-006, AC-009, AC-013, AC-014–AC-015.

## Validation / Documentation

- [ ] **ID-002-T040 — Run repository validation with pnpm.** After implementation, inspect the
      actual scripts in `package.json` and run applicable commands using pnpm only:
      `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`. Record failures instead of
      suppressing them with `any`, `@ts-ignore` or broad lint disables.  
      **Depends on:** ID-002-T036–ID-002-T039.  
      **Trace:** Definition of Done quality and validation requirements.

- [ ] **ID-002-T041 — Verify architecture compliance.** Review the implementation against Identity
      Clean Architecture and the plan: presentation has no business logic, application coordinates
      ports, domain is framework-independent, infrastructure owns TypeORM/R2, no cross-service DB
      access exists, Authentication/RBAC are reused rather than duplicated, and no business entity
      is moved into `libs/`.  
      **Depends on:** ID-002-T027, ID-002-T030, ID-002-T039–ID-002-T040.  
      **Trace:** Plan Architecture Compliance; ID-002-SR-008, AC-014.

- [ ] **ID-002-T042 — Verify implementation against the Approved specification.** Check every
      Functional Requirement, Security Requirement, Acceptance Criterion, privacy rule,
      authorization rule, migration requirement and API documentation item. Confirm no Out-of-Scope
      behavior (authentication changes, RBAC engine, Learning/Submission data, Community storage,
      social graph or new service) was added. Update this checklist with the real completion state
      and report any deviation or unverified provisioning/R2 dependency.  
      **Depends on:** ID-002-T028, ID-002-T034–ID-002-T041.  
      **Trace:** Final SDD verification; Definition of Done.

## Requirement Coverage Summary

| Requirement group    | Task coverage                                          |
| -------------------- | ------------------------------------------------------ |
| ID-002-FR-001–FR-006 | T005–T012, T020–T021, T025, T031                       |
| ID-002-FR-007–FR-011 | T022–T023, T026–T032, T036–T037                        |
| ID-002-FR-012–FR-013 | T015–T019, T024–T025, T037–T039                        |
| ID-002-FR-014–FR-016 | T004–T014, T020–T021, T036, T038–T042                  |
| ID-002-SR-001–SR-008 | T006, T009, T017–T019, T025–T026, T029–T033, T037–T042 |
| ID-002-AC-001–AC-015 | T007, T012, T014, T019, T028, T032, T036–T042          |

## Definition of Done Reference

ID-002 follows [`specs/00-system/definition-of-done.md`](../../00-system/definition-of-done.md).
The feature is not Done until the Approved spec/plan/tasks are consistent, applicable code and
migrations are implemented and verified, authorization/privacy/security tests pass, Swagger is
updated, `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass, and every requirement and
acceptance criterion has been checked against the implementation.

> This file is an implementation checklist, not a specification. Do not add requirements or
> silently change the Approved ID-002 spec/plan while executing these tasks.
