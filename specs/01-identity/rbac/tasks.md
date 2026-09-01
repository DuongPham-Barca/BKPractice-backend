# ID-003 RBAC Implementation Tasks

## Status

Approved — Ready for Implementation

Approved by the human product owner on `2026-09-01`.

Related specification: [`./spec.md`](./spec.md) — Approved revision `0.3`  
Related plan: [`./plan.md`](./plan.md) — Approved on `2026-09-01`

All implementation tasks start incomplete. Mark a task `[x]` only after the implementation and its
listed verification are complete. Keep this checklist synchronized with the actual implementation;
do not mark a task complete because a file merely exists.

## Preparation / Reuse Analysis

- [ ] **ID-003-T001 — Reconfirm the implementation baseline.** Inspect Git state, the Approved
      RBAC spec/plan, Identity architecture, Gateway architecture, dependency rules, current
      Identity entities/datasource/migration, Auth principal context, Gateway `/api/roles` routing
      and existing tests. Report any conflict before changing source.  
      **Depends on:** None.  
      **Trace:** SDD workflow; plan Existing Code Impact; Definition of Done.

- [ ] **ID-003-T002 — Confirm Approved artifacts and scope.** Verify `spec.md` and `plan.md` are
      both `Approved`, Open Questions are empty, and no implementation task introduces custom roles,
      dynamic IAM, role CRUD, audit service, OAuth/MFA, or another authorization microservice.  
      **Depends on:** ID-003-T001.  
      **Trace:** ID-003-FR-002, ID-003-FR-016; Out of Scope; Definition of Done.

- [ ] **ID-003-T003 — Confirm reusable Identity and Gateway contracts.** Identify the ID-001
      verified principal/token context, account-status check, existing `RoleName`/permission
      persistence, global validation/error/Swagger bootstrap, Gateway header sanitization and
      `/api/roles` forwarding. Reuse compatible components and record any missing seam instead of
      creating a duplicate authentication mechanism.  
      **Depends on:** ID-003-T001–ID-003-T002.  
      **Trace:** ID-003-FR-001, ID-003-FR-005, ID-003-FR-011, ID-003-FR-013; ID-003-SR-002,
      ID-003-SR-007–ID-003-SR-008; plan Existing Code Impact.

- [ ] **ID-003-T004 — Confirm service and database boundaries.** Record that roles, permissions and
      assignments remain in `bkpractice_identity`; Learning, Submission, Community and Profile keep
      their own action/resource/ownership rules; no cross-service datasource, foreign key, repository
      or business entity may be introduced.  
      **Depends on:** ID-003-T001.  
      **Trace:** ID-003-FR-001, ID-003-FR-012, ID-003-FR-016; ID-003-SR-008; AC-013, AC-016.

## Canonical Role and Permission Definitions

- [ ] **ID-003-T005 — Establish one canonical role definition.** Create or align the
      framework-independent role type for exactly `STUDENT`, `LECTURER` and `ADMIN`, and map the
      existing TypeORM enum/persistence model to it without changing the database enum. Reject
      caller-created or unknown platform roles.  
      **Depends on:** ID-003-T003–ID-003-T004.  
      **Trace:** ID-003-FR-002; ID-003-SR-004, ID-003-SR-006; AC-014, AC-016.

- [ ] **ID-003-T006 — Add stable permission-code handling.** Implement the minimal domain/validation
      boundary for the approved `resource:action` permission identifier convention. Keep permission
      definitions Identity-owned and static; do not invent a complete Learning/Submission/Community
      catalog or runtime role/permission CRUD.  
      **Depends on:** ID-003-T005.  
      **Trace:** ID-003-FR-001, ID-003-FR-004; ID-003-SR-004; AC-001, AC-004, AC-014.

- [ ] **ID-003-T007 — Define the trusted principal contract.** Reuse the ID-001 contract when
      available; otherwise create only the technical principal shape required across boundaries
      (`userId`, trusted roles and approved account-status context). Exclude passwords, tokens,
      provider claims and persistence entities.  
      **Depends on:** ID-003-T003, ID-003-T005.  
      **Trace:** ID-003-FR-005, ID-003-FR-011; ID-003-SR-002, ID-003-SR-007, ID-003-SR-009.

## Domain Rules and Invariants

- [ ] **ID-003-T008 — Implement authorization decision policy.** Add the framework-independent
      policy for explicit role/permission matching, multi-role union, feature-policy input,
      ownership as a separate feature concern, and default deny for missing/unknown/ambiguous
      policy.  
      **Depends on:** ID-003-T005–ID-003-T007.  
      **Trace:** ID-003-FR-003–ID-003-FR-008, ID-003-FR-012; ID-003-SR-003–ID-003-SR-004,
      ID-003-SR-006, ID-003-SR-010; AC-001–AC-006, AC-012, AC-014.

- [ ] **ID-003-T009 — Implement role-assignment policy.** Enforce that only an authorized `ADMIN`
      may inspect, assign or revoke roles; cross-user operations target only `STUDENT` or
      `LECTURER`; no caller may self-escalate; and Profile/Auth request data cannot mutate RBAC.
      Keep role-permission mappings static.  
      **Depends on:** ID-003-T005, ID-003-T007–ID-003-T008.  
      **Trace:** ID-003-FR-009–ID-003-FR-012, ID-003-FR-015; ID-003-SR-001–ID-003-SR-006;
      AC-007–AC-009, AC-012.

- [ ] **ID-003-T010 — Implement idempotency and last-Admin invariants.** Make existing assignment
      and absent `STUDENT`/`LECTURER` revocation successful no-ops. Allow an Admin to self-revoke the
      `ADMIN` role only when another Admin remains, and reject every operation that would remove the
      final Admin. Keep the invariant independent of DTO/controller code.  
      **Depends on:** ID-003-T009.  
      **Trace:** ID-003-FR-010, ID-003-FR-010a; ID-003-SR-001, ID-003-SR-005a; AC-008a–AC-008d.

- [ ] **ID-003-T011 — Add domain policy tests.** Test canonical roles, permission-code validation,
      multi-role union, default deny, Admin-only role management, prohibited Admin grants,
      self-revocation rules, final-Admin protection and idempotent operations without framework or
      persistence dependencies.  
      **Depends on:** ID-003-T006, ID-003-T008–ID-003-T010.  
      **Trace:** ID-003-FR-002–ID-003-FR-010a; ID-003-SR-001, ID-003-SR-004–ID-003-SR-006;
      AC-001–AC-008d, AC-014.

## Application Ports and Use Cases

- [ ] **ID-003-T012 — Define only the planned application ports.** Add `RbacRepository`,
      `IdentityAccountContext`, `TransactionRunner` and `AuthorizationPrincipalProvider` ports (or
      reuse compatible ID-001 ports). Keep ports free of TypeORM, NestJS, HTTP and Gateway response
      types; do not add generic repository/CQRS abstractions.  
      **Depends on:** ID-003-T007–ID-003-T010.  
      **Trace:** plan Application / Use Cases and Architecture Compliance; ID-003-FR-001,
      ID-003-FR-004, ID-003-FR-011.

- [ ] **ID-003-T013 — Implement `GetUserRoles`.** Coordinate Admin authorization, target-user
      lookup and safe role output. Derive actor identity from the trusted principal, return only
      target `userId` and role names, and map not-found/forbidden behavior through existing errors.
      **Depends on:** ID-003-T009, ID-003-T012.  
      **Trace:** ID-003-FR-009–ID-003-FR-011; ID-003-SR-001–ID-003-SR-003; AC-008c, AC-012.

- [ ] **ID-003-T014 — Implement `AssignRoleToUser`.** Coordinate Admin-only authorization, target
      existence, `STUDENT`/`LECTURER` allowlist, no-Admin-grant policy, idempotent persistence and
      safe resulting-state output. Do not accept actor role or identity fields from the request.  
      **Depends on:** ID-003-T009–ID-003-T012.  
      **Trace:** ID-003-FR-009–ID-003-FR-010; ID-003-SR-001, ID-003-SR-005, ID-003-SR-005a;
      AC-007–AC-008d.

- [ ] **ID-003-T015 — Implement `RevokeRoleFromUser`.** Coordinate Admin-only authorization,
      target validation and idempotent `STUDENT`/`LECTURER` revocation for any target, including the
      actor. Permit `ADMIN` self-revocation only through the controlled exception, and reject
      final-Admin removal before persistence changes.  
      **Depends on:** ID-003-T009–ID-003-T012.  
      **Trace:** ID-003-FR-009–ID-003-FR-010a; ID-003-SR-001, ID-003-SR-005a; AC-008b–AC-008d.

- [ ] **ID-003-T016 — Implement internal `EvaluateAuthorization`.** Expose a typed application seam
      for evaluating a trusted principal against a stable permission and optional feature-owned
      ownership result. Keep it internal; do not create a public `/authorize` endpoint or a remote
      call for every request.  
      **Depends on:** ID-003-T008, ID-003-T012.  
      **Trace:** ID-003-FR-003–ID-003-FR-008, ID-003-FR-012; ID-003-SR-003–ID-003-SR-004;
      AC-001–AC-006, AC-012–AC-014.

## Persistence

- [ ] **ID-003-T017 — Implement the TypeORM RBAC repository adapter.** Reuse the existing Role,
      Permission and User relation models to read roles/effective permissions and perform explicit
      assignment/revocation operations. Keep all queries in `bkpractice_identity`; do not spread
      request bodies into entities or import another service's datasource.  
      **Depends on:** ID-003-T012–ID-003-T016.  
      **Trace:** ID-003-FR-001, ID-003-FR-003–ID-003-FR-004, ID-003-FR-009–ID-003-FR-010;
      ID-003-SR-005, ID-003-SR-008; AC-001, AC-006, AC-008c–AC-008d, AC-016.

- [ ] **ID-003-T018 — Add transactional final-Admin protection.** Implement the database-safe
      transaction/locking strategy for Admin self-revocation and concurrent role changes. Ensure
      the final-Admin count is checked and the mutation committed atomically, with rollback on
      failure.  
      **Depends on:** ID-003-T010, ID-003-T012, ID-003-T017.  
      **Trace:** ID-003-FR-010a; ID-003-SR-005a, ID-003-SR-010; AC-008b, AC-014.

- [ ] **ID-003-T019 — Add persistence and concurrency tests.** Verify existing schema relations,
      composite uniqueness, effective role-permission lookup, target-not-found rollback,
      idempotent join-table operations and concurrent final-Admin protection. Confirm no
      cross-service database access is introduced.  
      **Depends on:** ID-003-T017–ID-003-T018.  
      **Trace:** ID-003-FR-001, ID-003-FR-003, ID-003-FR-010a, ID-003-FR-016;
      ID-003-SR-005a, ID-003-SR-008; AC-006, AC-008b–AC-008d, AC-016.

## Database / Migration

> **N/A for ID-003 v1:** The Approved plan confirms that the existing Identity migration already
> creates the static role enum, roles, permissions, `user_roles` and `role_permissions` with the
> required uniqueness and local foreign keys. No schema migration, seed migration or existing-user
> backfill is planned. The verification task below confirms this decision during implementation.

- [ ] **ID-003-T020 — Verify the existing Identity schema and migration strategy.** Inspect the
      baseline migration and isolated database to confirm static role seeds, composite assignment
      uniqueness, local ownership and `synchronize: false`. If a missing constraint is discovered,
      stop and report a separately reviewed migration need rather than silently changing schema.  
      **Depends on:** ID-003-T003–ID-003-T004, ID-003-T017.  
      **Trace:** plan Database Changes/Migration; ID-003-FR-001, ID-003-FR-002, ID-003-FR-016;
      ID-003-SR-008; AC-016.

- [ ] **ID-003-T021 — Verify static catalog and provisioning boundaries.** Confirm the three static
      roles remain seeded, permission definitions are not runtime CRUD, imported students receive
      `STUDENT` through the trusted ID-001 provisioning workflow, and ID-003 does not parse Excel,
      create users or bootstrap Admin accounts through a public endpoint.  
      **Depends on:** ID-003-T020.  
      **Trace:** ID-003-FR-001–ID-003-FR-002, ID-003-FR-016; Out of Scope; AC-016.

## Authentication Integration

- [ ] **ID-003-T022 — Reuse the ID-001 authenticated principal.** Bind RBAC to the verified
      ID-001/Gateway principal and account-status context. Distinguish missing/invalid
      authentication (`401`) from insufficient authorization (`403`); do not build a second JWT,
      Microsoft or refresh-token flow.  
      **Depends on:** ID-003-T003, ID-003-T007, ID-003-T012.  
      **Trace:** ID-003-FR-005, ID-003-FR-011, ID-003-FR-013–ID-003-FR-014;
      ID-003-SR-002, ID-003-SR-007, ID-003-SR-010; AC-003, AC-005, AC-010–AC-011, AC-013.

- [ ] **ID-003-T023 — Add Identity-side trusted-context guard integration.** Reuse ID-001 token
      verification or its approved context adapter for protected RBAC routes. Reject direct or
      misrouted requests that rely only on client-supplied `x-auth-user-id`, `x-auth-roles` or
      equivalent metadata.  
      **Depends on:** ID-003-T022.  
      **Trace:** ID-003-FR-006, ID-003-FR-011; ID-003-SR-002–ID-003-SR-003, ID-003-SR-010;
      AC-003, AC-005, AC-013–AC-014.

- [ ] **ID-003-T024 — Verify role-change token semantics.** Confirm that role assignment/revocation
      does not mutate already issued ID-001 access tokens, while newly issued tokens use the current
      approved role state and account-status rules. Do not add a distributed blacklist.  
      **Depends on:** ID-003-T022–ID-003-T023.  
      **Trace:** ID-003-FR-013–ID-003-FR-014; ID-003-SR-007; AC-010–AC-011.

## API / Presentation

- [ ] **ID-003-T025 — Create role-management DTOs and validation.** Add the planned assign request,
      role path mapping and safe role-operation response DTOs. Allow only canonical role values,
      reject unknown fields and never accept actor identity, actor role, permissions, account status
      or token claims from clients.  
      **Depends on:** ID-003-T005–ID-003-T006, ID-003-T012.  
      **Trace:** ID-003-FR-002, ID-003-FR-006, ID-003-FR-009–ID-003-FR-011;
      ID-003-SR-002, ID-003-SR-009; AC-005, AC-014–AC-015.

- [ ] **ID-003-T026 — Implement the RBAC controller routes.** Add only the approved role-management
      operations: `GET /api/roles/users/:userId`, `POST /api/roles/users/:userId` and
      `DELETE /api/roles/users/:userId/:role`. Invoke one application operation per request, derive
      the actor from the trusted principal and keep controllers free of business/persistence logic.
      **Depends on:** ID-003-T013–ID-003-T016, ID-003-T023, ID-003-T025.  
      **Trace:** ID-003-FR-006, ID-003-FR-009–ID-003-FR-011; ID-003-SR-001–ID-003-SR-003;
      AC-002–AC-005, AC-007–AC-008d, AC-012.

- [ ] **ID-003-T027 — Map errors and safe responses.** Map domain/application errors to the
      existing Identity/Gateway `400`/`401`/`403`/`404`/conflict conventions. Return only safe
      user/role assignment state; preserve idempotent success and never expose policy internals,
      passwords, hashes, provider data or tokens.  
      **Depends on:** ID-003-T013–ID-003-T016, ID-003-T025–ID-003-T026.  
      **Trace:** ID-003-FR-009–ID-003-FR-011; ID-003-SR-009–ID-003-SR-010;
      AC-002–AC-005, AC-008a–AC-008d, AC-014–AC-015.

- [ ] **ID-003-T028 — Wire the RBAC module at the Identity composition root.** Register domain
      policies, application use cases, TypeORM adapters, principal guard/context and controller in
      `IdentityServiceModule`/RBAC module. Preserve existing Auth/Profile modules and avoid circular
      dependencies.  
      **Depends on:** ID-003-T012–ID-003-T027.  
      **Trace:** ID-003-FR-001, ID-003-FR-016; plan Architecture Compliance; AC-016.

- [ ] **ID-003-T029 — Update Swagger/OpenAPI metadata.** Document the three role-management routes,
      Bearer/Admin requirements, request enum, safe response shape and relevant error statuses using
      the existing Identity Swagger conventions. Do not expose persistence entities or secrets.  
      **Depends on:** ID-003-T025–ID-003-T028.  
      **Trace:** Definition of Done API documentation; ID-003-FR-009–ID-003-FR-010;
      ID-003-SR-009; AC-008c, AC-008d, AC-015.

## API Gateway and Cross-Service Context

- [ ] **ID-003-T030 — Verify Gateway `/api/roles` integration.** Confirm the existing Gateway route
      forwards all RBAC operations to Identity, protects them as non-public routes, removes spoofed
      identity headers and forwards only verified context. Modify Gateway only if a narrow transport
      compatibility issue is found; do not add role business logic there.  
      **Depends on:** ID-003-T023, ID-003-T026.  
      **Trace:** ID-003-FR-006, ID-003-FR-011; ID-003-SR-002–ID-003-SR-003; AC-003, AC-005, AC-013.

- [ ] **ID-003-T031 — Verify the technical cross-service principal contract.** If required by the
      approved ID-001 contract, export only the context-neutral principal/role identifier shape from
      `libs/contracts`. Confirm Learning, Submission and Community consume trusted context and keep
      final action/resource/ownership enforcement locally; do not import Identity entities or query
      `bkpractice_identity`.  
      **Depends on:** ID-003-T007, ID-003-T030.  
      **Trace:** ID-003-FR-011–ID-003-FR-012, ID-003-FR-016; ID-003-SR-003, ID-003-SR-008;
      AC-005, AC-013, AC-016.

## Security and Boundary Verification

- [ ] **ID-003-T032 — Add privilege-escalation security tests.** Verify Student cannot grant
      Lecturer/Admin, Lecturer cannot grant Admin, Admin cannot grant Admin to another User, client
      body/headers cannot change actor roles, and Profile/Auth operations cannot mutate RBAC.  
      **Depends on:** ID-003-T014–ID-003-T016, ID-003-T023, ID-003-T026.  
      **Trace:** ID-003-FR-009–ID-003-FR-011, ID-003-FR-015; ID-003-SR-001–ID-003-SR-003,
      ID-003-SR-005–ID-003-SR-006; AC-005, AC-007–AC-009, AC-012.

- [ ] **ID-003-T033 — Add protected-Admin and idempotency tests.** Verify final-Admin removal is
      rejected, Admin self-revocation of the `ADMIN` role succeeds only when another Admin remains,
      Admin can idempotently revoke `STUDENT`/`LECTURER` from an allowed target, repeated assignment
      creates no duplicate and absent-role revocation is a safe no-op.  
      **Depends on:** ID-003-T018–ID-003-T019, ID-003-T026.  
      **Trace:** ID-003-FR-010–ID-003-FR-010a; ID-003-SR-005a, ID-003-SR-010;
      AC-008a–AC-008d.

- [ ] **ID-003-T034 — Verify account status and failure boundaries.** Test that `LOCKED`/`PENDING`
      behavior remains governed by ID-001, invalid/missing principals fail closed, unauthenticated
      requests are `401`, insufficient permissions are `403`, and no Admin role bypasses status or
      feature ownership rules.  
      **Depends on:** ID-003-T008, ID-003-T022–ID-003-T027.  
      **Trace:** ID-003-FR-005, ID-003-FR-007–ID-003-FR-008, ID-003-FR-013;
      ID-003-SR-004, ID-003-SR-006, ID-003-SR-010; AC-002–AC-004, AC-011–AC-014.

- [ ] **ID-003-T035 — Verify sensitive-data-safe output and logging.** Inspect response DTOs, error
      mapping and logs to ensure no password/hash, JWT/refresh token, provider credential, raw auth
      header or unnecessary permission-table data is exposed.  
      **Depends on:** ID-003-T027–ID-003-T029.  
      **Trace:** ID-003-SR-009; AC-015.

## Testing

- [ ] **ID-003-T036 — Complete unit-test coverage and requirement mapping.** Consolidate domain and
      application tests for role vocabulary, permission evaluation, default deny, Admin-only
      assignment, final-Admin policy, idempotency and token/status interactions. Link each test to
      its FR/SR/AC identifier.  
      **Depends on:** ID-003-T011, ID-003-T013–ID-003-T016, ID-003-T032–ID-003-T034.  
      **Trace:** All applicable ID-003 FR/SR/AC groups in the traceability matrix below.

- [ ] **ID-003-T037 — Complete persistence/integration tests.** Run the RBAC repository against an
      isolated Identity PostgreSQL database, verify role/permission joins and transaction behavior,
      and confirm schema ownership/uniqueness with `synchronize: false`.  
      **Depends on:** ID-003-T019–ID-003-T021.  
      **Trace:** ID-003-FR-001, ID-003-FR-003, ID-003-FR-010a, ID-003-FR-016; AC-006, AC-008b–AC-008d,
      AC-016.

- [ ] **ID-003-T038 — Complete API/Gateway and contract tests.** Exercise allowed and denied
      role-management requests through the Gateway, header spoofing, authentication-vs-forbidden
      behavior, safe responses, idempotency and trusted principal propagation.  
      **Depends on:** ID-003-T026–ID-003-T031, ID-003-T035.  
      **Trace:** ID-003-FR-005–ID-003-FR-011; ID-003-SR-001–ID-003-SR-003, ID-003-SR-009–ID-003-SR-010;
      AC-002–AC-005, AC-007–AC-008d, AC-013–AC-015.

## Messaging / Realtime

> **N/A:** ID-003 has no approved RabbitMQ event, Socket.IO flow or Redis authorization state.
> No messaging/realtime task is created. Role changes are synchronous Identity transactions and
> existing ID-001 token expiry remains authoritative.

## Validation

- [ ] **ID-003-T039 — Run repository validation with pnpm.** After implementation, inspect
      `package.json` and run the actual available scripts: `pnpm lint`, `pnpm typecheck`,
      `pnpm test` and `pnpm build`. Record failures and unverified behavior instead of suppressing
      errors.  
      **Depends on:** ID-003-T036–ID-003-T038.  
      **Trace:** Definition of Done; plan Testing Strategy.

- [ ] **ID-003-T040 — Review Swagger and operational documentation.** Confirm role-management API
      documentation, safe logging/correlation behavior, Admin bootstrap prerequisite and the
      no-migration/no-messaging decisions are accurately recorded without adding a new feature
      scope.  
      **Depends on:** ID-003-T021, ID-003-T029, ID-003-T035, ID-003-T039.  
      **Trace:** Definition of Done; plan Observability/Risks.

## Architecture Compliance

- [ ] **ID-003-T041 — Verify Identity Clean Architecture compliance.** Review the final source against
      the plan: presentation only handles transport, application coordinates use cases/ports,
      domain owns RBAC invariants, infrastructure implements TypeORM/auth adapters, and no layer
      imports a forbidden implementation.  
      **Depends on:** ID-003-T028, ID-003-T036–ID-003-T040.  
      **Trace:** ID-003-FR-001, ID-003-FR-016; ID-003-SR-003, ID-003-SR-008, ID-003-SR-010;
      AC-016; plan Architecture Compliance.

- [ ] **ID-003-T042 — Verify Gateway and service-boundary compliance.** Confirm Gateway contains no
      RBAC persistence/business logic, business services retain final action/resource/ownership
      authorization, no cross-service database access exists and `libs/` contains no Identity
      business entities or repositories.  
      **Depends on:** ID-003-T030–ID-003-T031, ID-003-T041.  
      **Trace:** ID-003-FR-006, ID-003-FR-011–ID-003-FR-012, ID-003-FR-016;
      ID-003-SR-003, ID-003-SR-008; AC-013, AC-016.

## Final Specification Verification

- [ ] **ID-003-T043 — Verify implementation against the Approved specification.** Check every
      Functional Requirement, Security Requirement and Acceptance Criterion; verify the static
      three-role/multi-role model, Admin-only management, no Admin grant to others, final-Admin
      protection, idempotency, token/status semantics, error behavior, Out of Scope exclusions,
      tests and architecture compliance. Record deviations or blockers; do not rewrite the Approved
      spec to make implementation appear compliant.  
      **Depends on:** ID-003-T039–ID-003-T042.  
      **Trace:** All ID-003-FR-001–ID-003-FR-016, ID-003-SR-001–ID-003-SR-010 and
      ID-003-AC-001–ID-003-AC-016; Definition of Done.

- [ ] **ID-003-T044 — Synchronize task status and review state.** Mark only verified tasks `[x]`,
      keep blocked/partial work `[ ]`, record validation results and remaining risks, and request
      the authorized review before changing the specification status to `Implemented` or `Verified`.
      **Depends on:** ID-003-T043.  
      **Trace:** SDD workflow; Definition of Done.

## Requirement Coverage Summary

| Coverage                                                        | Task mapping                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Role ownership, static vocabulary and no role-service split     | ID-003-T004–T006, ID-003-T017, ID-003-T020–T021, ID-003-T028, ID-003-T041–T043 |
| Multi-role union, permission evaluation and default deny        | ID-003-T006, ID-003-T008, ID-003-T011, ID-003-T016, ID-003-T036                |
| Admin-only assignment, no Admin grant and last-Admin protection | ID-003-T009–T010, ID-003-T014–T015, ID-003-T018–T019, ID-003-T032–T033         |
| Trusted authentication context and token/status semantics       | ID-003-T007, ID-003-T022–T024, ID-003-T030–T031, ID-003-T034, ID-003-T038      |
| Profile/Auth boundary and feature-service ownership             | ID-003-T004, ID-003-T009, ID-003-T031–T032, ID-003-T042–T043                   |
| Safe API behavior, errors and sensitive-data handling           | ID-003-T025–T029, ID-003-T035, ID-003-T038                                     |
| Persistence ownership, uniqueness and migration verification    | ID-003-T017–T021, ID-003-T037, ID-003-T042                                     |
| Final quality/architecture/spec verification                    | ID-003-T039–T044                                                               |

> This checklist describes implementation work only. It does not add behavior beyond Approved
> `spec.md`, and it does not implement RBAC in this phase.
