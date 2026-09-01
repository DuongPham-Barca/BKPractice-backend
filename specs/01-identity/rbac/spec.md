# ID-003 Role-Based Access Control (RBAC)

## Status

Approved

Allowed values: `Proposed` | `Approved` | `Implemented` | `Verified`

## Goal

Define the Identity-owned authorization model that determines whether an authenticated BKPractice
user may perform an action, while keeping authentication, Profile ownership and feature-specific
business authorization in their existing bounded contexts.

## Actors

- **STUDENT:** A platform role for learners. A Student receives only the permissions explicitly
  assigned to the role and remains subject to resource ownership and feature policy.
- **LECTURER:** A platform role for teaching staff. A Lecturer receives only explicitly assigned
  permissions and is not an implicit Administrator.
- **ADMIN:** A platform role for platform administration. Admin access is still subject to the
  business rules of the operation's owning service unless an approved policy grants the operation.
- **Authenticated user:** A user identified by the verified ID-001 Authentication context. A valid
  access token alone does not imply authorization for every operation.
- **API Gateway:** Verifies BKPractice access tokens and may forward trusted identity/role metadata;
  it does not own role assignments or domain authorization state.
- **Learning, Submission and Community services:** Trusted consuming services that enforce the
  authorization decision at their own business boundary. They do not own roles or permissions.
- **Identity Service:** Owns platform roles, permissions, assignments and authorization policy.
- **Unauthenticated caller:** Has no authorization context and cannot perform protected actions.

## Context

Authentication answers **“Who are you?”** and is defined by [ID-001 Authentication](../authentication/spec.md).
Profile answers **“What personal profile information does this user present?”** and is defined by
[ID-002 Profile](../profile/spec.md). RBAC answers **“What is this authenticated user allowed to
do?”**.

The authoritative system documents define `STUDENT`, `LECTURER` and `ADMIN` as Identity-owned RBAC
roles, not services. The current Identity foundation contains a role enum with these three values,
a unique permission-code model, a User-to-Role many-to-many relation and a Role-to-Permission
many-to-many relation. ID-003 defines the behavior and boundaries of that model without prescribing
tables or a new authorization technology.

ID-001 supplies the authenticated subject, account status and time-bounded role snapshot. ID-002
explicitly forbids Profile operations from changing roles, permissions or account status. Feature
specifications for Learning, Submission and Community will define the detailed action/resource
policies that consume this common RBAC foundation.

## Functional Requirements

- **ID-003-FR-001 — Identity ownership:** Identity MUST own the platform role catalog, permission
  definitions and User-role/role-permission assignments. Other services MUST NOT create duplicate
  role tables or assign platform roles in their own databases.
- **ID-003-FR-002 — Approved role vocabulary:** The ID-003 v1 role vocabulary MUST contain only
  `STUDENT`, `LECTURER` and `ADMIN`. A caller MUST NOT create or self-introduce another platform
  role through an authorization request.
- **ID-003-FR-003 — Multiple roles:** A User MAY hold more than one approved role. Having multiple
  roles combines the permissions explicitly granted by those roles; it does not grant permissions
  outside the role-permission assignments.
- **ID-003-FR-004 — Role-permission authorization:** An authorization decision MUST evaluate the
  authenticated User's currently recognized roles and the permissions assigned to those roles,
  together with the action/resource policy supplied by the owning feature service.
- **ID-003-FR-005 — Authentication boundary:** A valid ID-001 access-token identity MUST be
  distinguished from authorization. An authenticated user without the required role/permission
  MUST be denied the protected action.
- **ID-003-FR-006 — Server-side enforcement:** Protected business actions MUST enforce authorization
  at a trusted backend boundary. Client-side role checks, hidden UI controls and browser-supplied
  role/permission fields MUST NOT be security decisions.
- **ID-003-FR-007 — Default deny:** When no applicable role/permission policy explicitly allows an
  action, the authorization decision MUST deny it.
- **ID-003-FR-008 — Least privilege:** A role or permission MUST grant only the capabilities
  explicitly associated with it. `LECTURER` MUST NOT be treated as `ADMIN`, and `ADMIN` MUST NOT
  bypass unrelated resource ownership or validation rules by default.
- **ID-003-FR-009 — Protected role changes:** Role assignments MUST change only through an
  authorized Identity-owned role-management workflow. Only an `ADMIN` MAY grant or revoke
  predefined roles, and a User MUST NOT grant, revoke or elevate their own roles or permissions
  through Profile, Authentication or arbitrary request data. An `ADMIN` self-revocation is allowed
  only through that workflow when another `ADMIN` remains. Role-permission mappings remain static
  seeded definitions in ID-003 v1.
- **ID-003-FR-010 — Cross-user role protection:** An `ADMIN` MAY assign or revoke only the
  predefined `STUDENT` and `LECTURER` roles for another User. No actor, including an `ADMIN`, MAY
  grant the `ADMIN` role to another User through the ID-003 role-management workflow.
- **ID-003-FR-010a — Protected administrator continuity:** The role-management workflow MUST NOT
  remove the `ADMIN` role from the last remaining administrator. An administrator MAY relinquish
  their own `ADMIN` role only when at least one other administrator remains.
- **ID-003-FR-011 — Trusted authorization context:** Services consuming RBAC MUST receive identity
  and role context only from the approved authentication/Gateway boundary or a trusted service
  contract. Caller-supplied role headers, body fields or query parameters MUST NOT override it.
- **ID-003-FR-012 — Feature ownership:** Learning, Submission, Community and Profile specifications
  remain responsible for their own action-level rules, resource ownership and scope checks. ID-003
  supplies the common role/permission policy but MUST NOT hard-code every future feature action.
- **ID-003-FR-013 — Account-status interaction:** RBAC MUST NOT override ID-001 account-status
  enforcement. `LOCKED` and `PENDING` accounts cannot obtain new tokens; existing token behavior
  follows ID-001's expiration policy, and RBAC does not reactivate an account.
- **ID-003-FR-014 — Role-change token semantics:** Role changes MUST follow ID-001's approved token
  policy: they affect newly issued identity claims, while already issued access tokens are not
  mutated and expire according to their configured lifetime.
- **ID-003-FR-015 — Profile boundary:** Profile operations MUST NOT mutate role, permission or
  account-status state. A role displayed by a future profile/community representation is read-only.
- **ID-003-FR-016 — No role-service split:** RBAC MUST remain inside Identity. `STUDENT`,
  `LECTURER` and `ADMIN` MUST NOT become separate applications, microservices or databases.

## Business Rules

- The platform role set is the existing `STUDENT`, `LECTURER`, `ADMIN` vocabulary. ID-003 does not
  introduce `SUPER_ADMIN`, `MODERATOR`, `TEACHER`, `INSTRUCTOR` or custom user-created roles.
- A User can have multiple approved roles, as established by the existing Identity role relation.
  A role is not inferred from email, Profile data, class membership or client input.
- Permissions are Identity-owned capabilities associated with roles. Feature specs define which
  capability an action requires; ID-003 does not invent a complete Learning/Submission/Community
  permission catalog.
- Authorization is the intersection of authenticated identity, current account-status policy,
  assigned roles/permissions and the owning service's action/resource/ownership rules.
- A valid token proves identity, not permission. Missing or ambiguous policy is denied.
- Resource ownership is not replaced by a broad role. For example, a feature may require the owner
  relation in addition to a role/permission; that feature owns the detailed check.
- Role assignment and role revocation are Identity operations. ID-003 v1 supports inspecting a
  User's roles, assigning `STUDENT` or `LECTURER`, and revoking `STUDENT` or `LECTURER`. Only an
  `ADMIN` may invoke these operations; role definitions and permission definitions are static
  seeded data and are not runtime CRUD in this feature.
- Assignment of `ADMIN` to another User is prohibited. The system MUST preserve at least one
  administrator by rejecting an operation that would remove the final `ADMIN` role.
- Repeating an assignment that already exists and revoking a role that is absent are idempotent
  successful operations; they MUST NOT create duplicate assignments or broaden access.
- Permission identifiers use a stable `resource:action` naming convention. Feature specifications
  define the concrete permission catalog for their own actions.
- A trusted imported student account receives the `STUDENT` role during provisioning. ID-003 does
  not create users or implement the import workflow.
- ID-001's imported-student provisioning and default-password workflow remains the source of
  account creation. ID-003 does not create users, parse Excel files or change credentials.
- ID-002's Profile update cannot be used to change roles, permissions or account status.
- Role changes do not rewrite existing access tokens. New authentication/refresh issuance uses the
  current role state according to ID-001.
- An Admin is not automatically exempt from a target service's validation, ownership or moderation
  rules unless that feature specification explicitly grants the capability.

## Authorization Rules

- An unauthenticated caller is never authorized for a protected business action.
- An authenticated caller with no matching role/permission is denied by default.
- `STUDENT` has no role-management capability by default.
- `LECTURER` has no system-role-management capability by default and is not promoted implicitly to
  `ADMIN`.
- `ADMIN` may inspect User roles and assign or revoke predefined `STUDENT` and `LECTURER` roles.
  `ADMIN` cannot grant `ADMIN` to another User, and the last remaining `ADMIN` cannot be removed.
- A role-management actor cannot use a Profile or Authentication payload to grant/revoke roles,
  permissions or account status.
- The Gateway may authenticate the request and forward trusted context, but the service owning the
  action performs the final business authorization check.
- Learning, Submission and Community consume Identity-owned role/permission context and enforce
  resource-level rules locally. They do not query the Identity database directly.
- Cross-service requests use approved service identity/transport contracts; arbitrary client-supplied
  trusted identity headers are never accepted.

## Inputs

### Authorization decision — conceptual operation

The owning service supplies:

- the verified authenticated User ID and trusted role context from ID-001/Gateway;
- the action/capability being requested;
- the target resource and ownership context, when applicable;
- the current account-status context required by the approved authentication boundary.

The caller MUST NOT supply authoritative roles, permissions, account status, policy decisions or
another User's identity in request data.

### Role-management input

An Identity-owned role-management operation may accept a target User ID, one of the predefined
`STUDENT` or `LECTURER` role values and the requested inspect/assign/revoke action. The actor MUST
be an `ADMIN`; `ADMIN` is not an assignable target role. Assigning an existing role or revoking an
absent role is idempotent success. The operation returns only the resulting safe assignment state.

## Outputs

- An authorization decision is either **allow** or **deny** with a reason category safe for the
  owning service's error convention. It does not expose password, refresh token, provider secret or
  internal policy data.
- An unauthenticated request follows the existing authentication convention (`401`).
- An authenticated request lacking the required role/permission or ownership receives the existing
  forbidden convention (`403`).
- Trusted downstream context contains only the identity/role information required by the approved
  contract; clients cannot replace it.
- A role-management operation returns only the resulting safe assignment state and never credentials
  or internal secrets.
- A role change does not retroactively mutate already issued ID-001 access tokens.

## Error Cases

| Case                                                          | Observable behavior                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Missing, malformed or expired access token                    | Existing authentication boundary returns `401`; no authorization decision is trusted                   |
| Authenticated user lacks required role/permission             | Existing forbidden convention returns `403`                                                            |
| No policy explicitly allows the action                        | Default-deny `403`                                                                                     |
| Client supplies role/permission/trusted identity fields       | Fields are ignored or rejected by the existing validation convention; they cannot affect authorization |
| Student or Lecturer attempts self-escalation                  | `403` and no assignment state changes                                                                  |
| Unauthorized actor attempts cross-user role change            | `403` and no assignment state changes                                                                  |
| Unknown role value is supplied to a role-management operation | Validation/business error and no state changes                                                         |
| Target User does not exist in a role-management operation     | Existing Identity `404` convention and no assignment state changes                                     |
| Role already assigned or role absent during revoke            | Operation succeeds idempotently; no duplicate assignment is created and no unrelated state changes     |
| Non-`ADMIN` actor attempts role management                    | `403` and no assignment state changes                                                                  |
| Any actor attempts to grant `ADMIN` to another User           | `403` or the existing validation/business error convention; no assignment state changes                |
| Operation would remove the last remaining `ADMIN`             | Existing conflict/business-rule error convention; assignment state remains unchanged                   |
| `LOCKED` or `PENDING` account presents a role                 | ID-001 status enforcement remains authoritative; RBAC does not issue or restore tokens                 |
| Gateway metadata is missing or spoofed                        | Trusted service boundary rejects the request; caller metadata is never treated as authoritative        |

ID-003 does not introduce a new error envelope. HTTP serialization follows the Identity/Gateway
convention and the owning service's existing authorization error mapping.

## Edge Cases

- A User with both `STUDENT` and `LECTURER` receives the union of explicitly assigned permissions;
  no role has implicit precedence over another.
- A User with `ADMIN` and another role still remains subject to account status and target-service
  policy.
- Removing one role must not remove permissions supplied by another remaining role.
- A role change while an access token is active does not mutate that token; ID-001 controls its
  natural expiration and future token issuance.
- A permission assigned to no role cannot authorize a User by itself.
- A role with no permission grants no protected action unless a feature explicitly defines a safe
  role-only check.
- A resource owner without the required feature permission remains denied; ownership alone is not
  an implicit system-wide grant.
- A permission-bearing role does not permit access to another service's database or repositories.
- Repeating an assignment that already exists or revoking an absent role is idempotent success; no
  duplicate rows or unrelated state changes are created.
- The last remaining `ADMIN` is protected. An Admin may self-revoke only if another Admin remains.
- Public Profile and Authentication responses never become a channel for changing or exposing the
  complete RBAC model.

## Security Requirements

- **ID-003-SR-001 — No privilege escalation:** A caller MUST NOT self-assign or self-grant
  privileged roles/permissions, or self-revoke them outside the authorized Admin role-management
  workflow, through any public request, Profile operation or Authentication input. An Admin
  self-revocation is permitted only when another Admin remains.
- **ID-003-SR-002 — Client input is untrusted:** Client-supplied role, permission, account-status
  and trusted-identity fields MUST NOT influence an authorization decision.
- **ID-003-SR-003 — Server-side enforcement:** Each protected business action MUST be checked at a
  trusted backend boundary; frontend visibility is never a security control.
- **ID-003-SR-004 — Least privilege/default deny:** Missing, unknown or ambiguous authorization
  policy MUST deny access, and roles MUST grant only explicitly assigned capabilities.
- **ID-003-SR-005 — Protected assignment boundary:** Only the Identity-owned role-management
  workflow may change role assignments, and only an `ADMIN` may invoke it. Other services and
  Profile APIs MUST NOT write roles/permissions; role-permission mappings remain static seeded data
  in ID-003 v1.
- **ID-003-SR-005a — Administrator protection:** The workflow MUST reject granting `ADMIN` to
  another User and MUST reject removing the last remaining `ADMIN` role.
- **ID-003-SR-006 — Role separation:** `LECTURER` MUST NOT be treated as `ADMIN`, and no role may
  bypass account status, resource ownership or feature validation by implication.
- **ID-003-SR-007 — Token consistency:** Authorization MUST respect ID-001 token-purpose, account
  status and role-snapshot rules. A Microsoft provider token or refresh token is never an RBAC
  credential.
- **ID-003-SR-008 — Service isolation:** Role/permission ownership remains in Identity; consumers
  MUST NOT query `bkpractice_identity` directly or create cross-service role foreign keys.
- **ID-003-SR-009 — Sensitive-data minimization:** Authorization responses, logs and errors MUST
  not expose passwords, token material, provider credentials or unnecessary internal policy data.
- **ID-003-SR-010 — Safe failure:** Invalid or unavailable authorization context MUST fail closed and
  must not fall back to client-supplied roles or an implicit Admin decision.

## Acceptance Criteria

- **ID-003-AC-001:** Given a valid ID-001 authenticated context and an action with a matching
  assigned role/permission, when the owning service evaluates authorization, then the decision is
  allowed subject to that service's resource/ownership rules.
- **ID-003-AC-002:** Given an authenticated user without the required role/permission, when a
  protected action is requested, then the request receives `403` and the action does not execute.
- **ID-003-AC-003:** Given an unauthenticated or invalid-token caller, when a protected action is
  requested, then the existing authentication boundary returns `401`.
- **ID-003-AC-004:** Given an action with no explicit allow policy, when authorization is evaluated,
  then default deny returns `403`.
- **ID-003-AC-005:** Given a request containing a caller-supplied role, permission or trusted
  identity header, when authorization is evaluated, then those values cannot change the decision.
- **ID-003-AC-006:** Given a User assigned multiple approved roles, when permissions are evaluated,
  then the resulting capabilities are the union of explicitly assigned role permissions and no
  unassigned capability is granted.
- **ID-003-AC-007:** Given a Student, when they attempt to assign themselves `LECTURER` or `ADMIN`,
  then the operation is denied and no assignment changes.
- **ID-003-AC-008:** Given a Lecturer, when they attempt to assign themselves `ADMIN`, then the
  operation is denied and no assignment changes.
- **ID-003-AC-008a:** Given an `ADMIN`, when they attempt to assign `ADMIN` to another User, then
  the operation is denied and no assignment changes.
- **ID-003-AC-008b:** Given the last remaining `ADMIN`, when any operation would remove that final
  `ADMIN` role, then the operation is denied and administrator continuity is preserved.
- **ID-003-AC-008c:** Given an `ADMIN`, when they inspect, assign `STUDENT`/`LECTURER`, or revoke
  `STUDENT`/`LECTURER` for a target User, then the operation succeeds subject to target and policy
  validation.
- **ID-003-AC-008d:** Given an assignment that already exists or a role that is absent during
  revoke, when an authorized `ADMIN` repeats the operation, then it succeeds idempotently without
  duplicate assignments or unrelated changes.
- **ID-003-AC-009:** Given a Profile or Authentication request containing role, permission or
  account-status fields, when it is processed, then those fields cannot mutate RBAC state.
- **ID-003-AC-010:** Given a role change, when a new ID-001 token is issued, then it reflects the
  current approved role state; an already issued access token is not mutated.
- **ID-003-AC-011:** Given a `LOCKED` or `PENDING` account, when authentication/token issuance is
  attempted, then ID-001 rejects issuance and RBAC does not grant an alternate path.
- **ID-003-AC-012:** Given a Lecturer request for a system-role-management action, when no approved
  permission grants it, then the action is denied and the Lecturer is not treated as Admin.
- **ID-003-AC-013:** Given a downstream Learning, Submission or Community action, when its service
  evaluates authorization, then it uses trusted Identity context and its own resource/ownership
  policy rather than querying the Identity database.
- **ID-003-AC-014:** Given an unknown role value or malformed authorization context, when it reaches
  a trusted authorization boundary, then it fails closed without changing assignments.
- **ID-003-AC-015:** Given an RBAC decision or failure, when the response/logs are inspected, then no
  password, token, provider secret or unnecessary internal policy data is exposed.
- **ID-003-AC-016:** Given the Identity schema and service boundaries, when role ownership is
  inspected, then roles/permissions remain in Identity and no role service, duplicate consumer
  tables or cross-service foreign keys exist.

## Out of Scope

- Authentication, login, logout, refresh tokens, Microsoft identity and `/auth/me` behavior
- Profile reads/updates, avatar storage and profile privacy implementation
- Learning-specific problem/course/assignment permissions and resource policies
- Submission execution/submit authorization details
- Community moderation action catalog
- OAuth, MFA, SSO, LDAP, Active Directory and external identity providers
- ABAC, PBAC, ReBAC, OPA, Casbin or a dynamic policy engine
- User-created/custom roles, tenant-specific roles, temporary roles or delegated administration
- Runtime role/permission definition CRUD and full role/permission CRUD UI unless separately
  approved; ID-003 v1 uses static seeded definitions
- Audit Service, analytics, notifications and role-history reporting unless separately approved
- Device/session management, token blacklist and token revocation redesign
- Excel parsing, student import, account creation and default-password provisioning
- Automatic role inference from email, Profile, faculty, class or Community activity
- A separate Role Service, Permission Service or Admin Service

## Dependencies

- [ID-001 Authentication](../authentication/spec.md) for verified identity, account status, trusted
  role snapshots and token semantics.
- [ID-002 Profile](../profile/spec.md) for the explicit prohibition on role/permission/status
  mutation through Profile.
- [Identity Service architecture](../../../docs/architecture/identity-service.md)
- [Service boundaries](../../../specs/00-system/service-boundaries.md)
- [Roles and permissions system rules](../../../specs/00-system/roles-permissions.md)
- [Dependency rules](../../../docs/architecture/dependency-rules.md)
- [System architecture](../../../docs/architecture/system-architecture.md)
- [API Gateway architecture](../../../docs/architecture/api-gateway.md)
- [SDD workflow](../../README.md)

## Open Questions

None. The v1 role-management policy is approved for specification purposes:

- only `ADMIN` may inspect, assign and revoke roles;
- only predefined `STUDENT` and `LECTURER` roles may be assigned or revoked through that workflow;
- `ADMIN` cannot be granted to another User;
- the last remaining `ADMIN` is protected;
- role and permission definitions are static seeded data;
- permission identifiers use `resource:action` naming;
- imported student accounts receive `STUDENT` during trusted provisioning; and
- repeated assignment/revocation is idempotent.

Audit history remains outside ID-003 v1 and is not required for implementation.

## Revision History

| Date       | Revision | Author/Reviewer       | Summary                                                            |
| ---------- | -------- | --------------------- | ------------------------------------------------------------------ |
| 2026-09-01 | 0.1      | Codex / TBD           | Initial Proposed RBAC specification                                |
| 2026-09-01 | 0.2      | Product owner / Codex | Approved v1 role-management and administrator-protection decisions |
| 2026-09-01 | 0.3      | Product owner         | Approved ID-003 RBAC specification                                 |

> `spec.md` describes WHAT. Detailed guards, decorators, permission resolvers, repositories,
> controllers, migrations and execution order belong in a future `plan.md` after human approval.
