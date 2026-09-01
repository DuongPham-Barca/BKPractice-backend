# ID-002 Profile

## Status

Approved

Allowed values: `Proposed` | `Approved` | `Implemented` | `Verified`

## Goal

Allow an authenticated BKPractice user to view and maintain the small set of personal profile
information needed by the learning platform and Community, while preserving the ownership of
authentication, authorization, learning and submission data in their respective domains.

## Actors

- **STUDENT:** Owns and maintains their profile.
- **LECTURER:** Owns and maintains their profile; does not manage another user's profile through
  ID-002.
- **ADMIN:** May view and update profile-owned fields for another user for platform administration.
- **Unauthenticated visitor:** May view only the public portion of an existing user's profile.
- **Identity Service:** Owns profile state and profile access policy.
- **Cloudflare R2:** External image-storage boundary for avatar objects; it does not own Profile
  records or Identity account data.

## Context

Authentication answers **“Who are you?”** and is defined by [ID-001 Authentication](../authentication/spec.md).
Profile answers **“What personal profile information does this user present?”**. Role and
permission management remains an RBAC responsibility, while courses, classes, progress,
submissions and Community posts remain owned by their respective services.

The Identity foundation already has one Profile relation per User with `displayName`, `avatarUrl`
and `bio`. ID-002 defines the behavior around those fields and adds no social-network graph.
Profiles are lazy-created because older or newly provisioned accounts may not yet have a Profile
row. When a profile is first requested or updated, its initial display name comes from the official
name supplied by the approved provisioning boundary.

Avatar images are stored in Cloudflare R2. ID-002 treats the avatar as an approved R2 object
reference and does not define a new object-storage provider. The exact bucket, object-key and
credential implementation belongs in a future `plan.md`.

## Functional Requirements

- **ID-002-FR-001 — Profile ownership:** Each BKPractice User MUST have at most one Identity-owned
  Profile associated with that User.
- **ID-002-FR-002 — Lazy profile initialization:** When an existing User without a Profile first
  retrieves or updates their own Profile, Identity MUST create the Profile using the official
  provisioned name as the initial `displayName`.
- **ID-002-FR-003 — View own profile:** An authenticated user MUST be able to retrieve their own
  Profile.
- **ID-002-FR-004 — Update own profile:** An authenticated user MUST be able to partially update
  their own editable Profile fields.
- **ID-002-FR-005 — Editable fields:** In v1, the owner MAY update only `displayName`, avatar
  reference and `bio`; a partial update MUST leave omitted fields unchanged.
- **ID-002-FR-006 — Controlled fields:** Profile update MUST NOT change email, MSSV/student ID,
  roles, permissions, account status, password or any other authentication/account field.
- **ID-002-FR-007 — Public profile:** The system MUST provide a public-profile read operation for
  an existing user that exposes only the approved public Profile fields.
- **ID-002-FR-008 — Public fields:** The public Profile representation MUST contain only
  `displayName`, avatar reference/URL and `bio`.
- **ID-002-FR-009 — Profile privacy:** Email, MSSV/student ID, password data, roles, permissions,
  account status, refresh-session data and provider identities MUST NOT be exposed by the public
  Profile operation.
- **ID-002-FR-010 — Admin profile management:** ADMIN MUST be able to view and update the
  Profile-owned fields of another user, subject to the same controlled-field restrictions.
- **ID-002-FR-011 — Lecturer boundary:** LECTURER MUST be able to manage their own Profile but MUST
  NOT update another user's Profile through ID-002.
- **ID-002-FR-012 — Avatar storage boundary:** A Profile avatar MUST reference an approved object
  stored through Cloudflare R2. ID-002 MUST NOT persist arbitrary client-provided external image
  URLs as if they were BKPractice-managed avatars.
- **ID-002-FR-013 — Input validation:** Profile input MUST be validated for field shape, supported
  nullability and approved avatar-reference format before Profile state changes.
- **ID-002-FR-014 — Profile-domain boundary:** Identity Profile MUST NOT own or persist class,
  course, learning-progress, solved-problem, score, submission-history or Community-post data.
- **ID-002-FR-015 — Stable profile lifecycle:** Profile retrieval and update MUST be safe to retry;
  concurrent initialization MUST result in at most one Profile for a User.
- **ID-002-FR-016 — No account deletion:** ID-002 MUST NOT delete the User account when a Profile
  field is cleared; nullable avatar and bio values MAY be cleared according to the update contract.

## Business Rules

- `displayName`, avatar reference and `bio` are the only Profile-owned v1 fields.
- `displayName` is initialized from the imported `họ tên` value when lazy creation occurs. The
  owner may subsequently personalize `displayName`; it MUST be at most 100 characters.
- `bio` is optional and MUST be at most 1,000 characters when supplied. Profile text trims leading
  and trailing whitespace, preserves Unicode characters (including Vietnamese text), and does not
  transliterate or case-fold user content.
- `studentId/MSSV` remains account identity used by Authentication and is not duplicated as a
  Profile-owned value. `email` remains account identity and is not editable through Profile.
- `lớp/className` remains Learning-owned. Faculty, department, lecturer code and other academic
  fields are not part of ID-002 v1.
- A public profile contains the three non-sensitive Profile fields only. Account and authorization
  data are not made public by having a Profile.
- Profile creation is lazy, but initialization is idempotent and uses the official provisioned name
  as its seed. No mandatory onboarding or Profile-completion gate is introduced.
- Replacing or clearing an avatar changes the Profile's approved R2 reference. Public avatar
  delivery uses a short-lived signed URL for the approved R2 object; arbitrary direct R2 URLs are
  not exposed as the public contract.
- Replacing or clearing an avatar MUST clear/update the Profile reference first. The previous R2
  object is eligible for asynchronous cleanup after a configured grace period; cleanup failure
  MUST NOT roll back a successful Profile update.
- A public profile for a `LOCKED` or `PENDING` account returns a generic unavailable result and
  does not reveal the account status. Authorized owner/Admin reads continue to follow the private
  Profile authorization rules.
- A Profile operation never grants access to courses, classes, progress, submissions or Community
  moderation capabilities.

## Authorization Rules

- A valid BKPractice access token is required to view or update one's own private Profile.
- STUDENT and LECTURER may read and update only their own Profile-owned fields.
- ADMIN may read and update another user's Profile-owned fields, but Profile APIs cannot mutate
  account status, roles, permissions, credentials or identifiers.
- An unauthenticated visitor may read only the public representation of an existing user's Profile.
- LECTURER has no ID-002 permission to update a Student's or another Lecturer's Profile.
- A Community service may reference `authorId`, but it does not gain direct access to the Identity
  database; Community profile composition remains a future cross-service integration.
- Authentication and RBAC decisions remain in ID-001/ID-003 and are not reimplemented by Profile.

## Inputs

### Own profile read — conceptual `GET /api/profile/me`

Requires a valid BKPractice Bearer access token and accepts no caller-supplied user ID for the
owner identity.

### Own profile update — conceptual `PATCH /api/profile/me`

Accepts a partial object containing only:

| Field         | Requirement                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `displayName` | Optional in a partial update; when present, a valid non-empty display name of at most 100 characters |
| `avatar`      | Optional approved R2 object reference, or an explicit clear operation                                |
| `bio`         | Optional string of at most 1,000 characters, or explicit null to clear                               |

The request MUST reject email, MSSV/student ID, roles, permissions, account status, password,
provider identifiers, arbitrary redirect URLs and unknown fields.

### Public profile read — conceptual `GET /api/users/:userId/profile`

Accepts the target user's stable Identity ID and returns only the public Profile representation.
It does not accept a request to reveal private account fields.

### Admin profile management — conceptual `GET/PATCH /api/users/:userId/profile`

The same target-profile operation MAY be used by ADMIN. Update input remains limited to the three
Profile-owned fields; an ADMIN request cannot modify account or authorization data through Profile.

Exact route naming, DTO shape and R2 upload authorization belong in a future implementation plan
and MUST follow the existing Gateway/API convention.

## Outputs

- Own-profile reads return the Profile-owned fields and the stable local user association required
  by the approved API contract; they do not return password/hash, refresh session or provider data.
- Public-profile reads return exactly `displayName`, avatar reference/URL and `bio`.
- Public avatar values in public-profile responses are short-lived signed URLs for approved R2
  objects; the response does not expose arbitrary direct storage URLs.
- The first own-profile read/update may create the missing Profile and returns the initialized
  result in the same operation.
- Successful partial updates return the resulting Profile representation without changing omitted
  fields.
- Clearing avatar or bio returns a successful profile with the corresponding nullable field empty;
  it never deletes the User account.
- Profile changes do not issue, revoke or rotate Authentication tokens and do not update Learning,
  Submission or Community business state.

## Error Cases

| Case                                                                               | Observable behavior                                                                             |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Missing/invalid access token for private operation                                 | Existing Gateway/authentication convention returns 401                                          |
| Target user or public profile does not exist                                       | Existing Identity not-found convention returns 404 without exposing unrelated data              |
| Public profile belongs to a `LOCKED` or `PENDING` account                          | Generic unavailable/not-found result without revealing the account status                       |
| Invalid field shape, unsupported value, unknown field or invalid R2 reference      | Validation failure (400) and no Profile state change                                            |
| Attempt to update email, MSSV, role, permission, status, password or provider data | Rejected as forbidden/invalid field (403 or existing validation convention) and no state change |
| LECTURER attempts to update another user's Profile                                 | 403 and no state change                                                                         |
| Non-ADMIN attempts to manage another user's Profile                                | 403 and no state change                                                                         |
| Concurrent first Profile initialization                                            | One Profile remains; retries return the same logical Profile                                    |
| R2 dependency unavailable during approved avatar operation                         | Existing normalized dependency error; no dangling Profile reference is committed                |
| Unexpected persistence failure                                                     | Existing normalized error envelope with request/correlation ID                                  |

ID-002 does not introduce a new error envelope. HTTP serialization follows the Identity/Gateway
convention established by the foundation.

## Edge Cases

- An imported account may have a Profile created lazily more than once concurrently; uniqueness and
  idempotency must prevent duplicate Profiles.
- A legacy User without a usable provisioned official name cannot be initialized with a fabricated
  identity value; the operation reports the existing data error and does not create an empty
  Profile.
- An omitted PATCH field is unchanged; an explicit nullable avatar/bio clear is intentional.
- Replacing an avatar must not expose arbitrary external URLs as trusted R2 content.
- Public reads never become a way to enumerate email, MSSV, roles, account status or authentication
  state.
- A deleted or inaccessible R2 object may result in a broken avatar reference; asynchronous cleanup
  uses a configured grace period and is independent from account deletion.
- Locking or changing a User's role does not allow Profile Update to bypass Authentication or RBAC.
- Profile data remains available independently of Learning progress, Submission history and
  Community content.

## Security Requirements

- **ID-002-SR-001 — Ownership enforcement:** Private Profile reads/updates MUST verify the caller's
  authenticated identity, and cross-user updates MUST require the approved ADMIN role.
- **ID-002-SR-002 — Mass-assignment protection:** Profile input MUST allowlist editable fields and
  reject unknown or account/authorization fields.
- **ID-002-SR-003 — Controlled account data:** Profile APIs MUST never change or expose password
  hashes, refresh tokens, provider credentials, email, MSSV, roles, permissions or account status
  outside their approved visibility.
- **ID-002-SR-004 — Public privacy:** Public Profile responses MUST contain only the approved
  non-sensitive fields and MUST NOT leak private account existence details beyond the requested
  profile result.
- **ID-002-SR-005 — Avatar integrity:** Avatar references MUST be restricted to approved R2 objects;
  arbitrary client URLs or untrusted storage credentials MUST NOT be persisted.
- **ID-002-SR-006 — Input safety:** Profile values MUST pass the shared validation and output
  serialization conventions before persistence or response.
- **ID-002-SR-007 — Safe logging:** Passwords, tokens, authorization headers, R2 credentials and
  sensitive account fields MUST NOT appear in Profile logs or errors.
- **ID-002-SR-008 — Service isolation:** Profile MUST not query another service's database or
  duplicate Learning, Submission, Community or RBAC business entities.

## Acceptance Criteria

- **ID-002-AC-001:** Given an authenticated user, when they request their own Profile, then Identity
  returns the Profile-owned data without password, token or provider-secret fields.
- **ID-002-AC-002:** Given an existing User without a Profile and an official provisioned name,
  when the user first reads or updates their Profile, then one Profile is created with that name as
  its initial `displayName`.
- **ID-002-AC-003:** Given an authenticated user, when they update `displayName`, avatar reference
  or `bio`, then only the supplied editable fields change and the resulting Profile is returned.
- **ID-002-AC-004:** Given an update that explicitly clears nullable avatar or bio, when validation
  succeeds, then the field is cleared without deleting the User account.
- **ID-002-AC-005:** Given malformed values, unsupported fields or an invalid avatar reference,
  when Profile validation runs, then the request is rejected and Profile state is unchanged.
- **ID-002-AC-005a:** Given a `displayName` longer than 100 characters, when Profile validation
  runs, then the request is rejected and Profile state is unchanged.
- **ID-002-AC-005b:** Given a `bio` longer than 1,000 characters, when Profile validation runs,
  then the request is rejected and Profile state is unchanged; valid Unicode content is preserved
  after trimming outer whitespace.
- **ID-002-AC-006:** Given a request containing email, MSSV, role, permission, account status,
  password or provider fields, when Profile update is attempted, then the request cannot mutate
  those fields.
- **ID-002-AC-007:** Given an unauthenticated caller, when a private own-profile read/update is
  attempted, then the existing authentication boundary rejects the request.
- **ID-002-AC-008:** Given an existing user, when a public profile is requested, then the response
  contains only `displayName`, avatar reference/URL and `bio`.
- **ID-002-AC-008a:** Given a `LOCKED` or `PENDING` account, when an unauthenticated public
  profile is requested, then the response is a generic unavailable/not-found result and does not
  reveal the account status.
- **ID-002-AC-009:** Given a public profile request, when the response is inspected, then email,
  MSSV, password/hash, roles, permissions, account status, refresh data and provider identity are
  absent.
- **ID-002-AC-010:** Given an ADMIN and another user's Profile, when ADMIN reads or updates it,
  then only Profile-owned fields can be managed.
- **ID-002-AC-011:** Given a LECTURER or STUDENT and another user's Profile, when they attempt to
  update it, then the operation is forbidden and no state changes.
- **ID-002-AC-012:** Given two concurrent first Profile requests for one User, when both complete,
  then at most one Profile exists and both successful responses represent the same Profile.
- **ID-002-AC-013:** Given a valid avatar update, when the stored reference is inspected, then it
  points to an approved Cloudflare R2 object and not an arbitrary external URL.
- **ID-002-AC-013a:** Given a public profile with an avatar, when the response is inspected, then
  the avatar value is a short-lived signed URL for the approved R2 object.
- **ID-002-AC-013b:** Given an avatar replacement or clear operation, when the Profile update
  succeeds, then the new/empty Profile reference is committed immediately and old-object cleanup
  is asynchronous and does not fail the Profile update.
- **ID-002-AC-014:** Given Profile operations, when Identity persistence is inspected, then no
  class, course, progress, solved-problem, score, submission-history or Community-post data is
  created or queried.
- **ID-002-AC-015:** Given a Profile update or read, when logs and errors are reviewed, then no
  password, token, R2 credential or sensitive account field is logged or returned.

## Out of Scope

- Authentication, login, logout, refresh tokens and `/auth/me` identity behavior
- Change Password and Change Email
- Forgot/Reset Password
- Role, permission and RBAC management
- Account lock/unlock, account deletion and lecturer approval
- Excel parsing, student provisioning and import reporting
- Class enrollment, faculty/class ownership and Learning progress
- Submission history, scores, achievements and badges
- Community posts, comments, reactions, followers, friends, timeline or messaging
- Avatar storage infrastructure other than the selected Cloudflare R2 boundary
- Profile verification, analytics, completion/onboarding gate and social reputation
- Google/Microsoft OAuth changes, MFA, SSO, Keycloak and external identity providers

## Dependencies

- [ID-001 Authentication](../authentication/spec.md)
- [Identity Service architecture](../../../docs/architecture/identity-service.md)
- [Service boundaries](../../../specs/00-system/service-boundaries.md)
- [Roles and permissions](../../../specs/00-system/roles-permissions.md)
- [Dependency rules](../../../docs/architecture/dependency-rules.md)
- [System architecture](../../../docs/architecture/system-architecture.md)
- [SDD workflow](../../README.md)
- The approved administrator provisioning contract supplies the initial `họ tên` value; ID-002
  does not implement that import workflow.
- Cloudflare R2 is the selected avatar storage boundary. Credentials, bucket policy, upload limits,
  object lifecycle and exact client/server flow remain implementation-plan concerns.

## Open Questions

None. Product decisions recorded in this specification are sufficient for the next SDD phase.

## Revision History

| Date       | Revision | Author/Reviewer  | Summary                                                                                      |
| ---------- | -------- | ---------------- | -------------------------------------------------------------------------------------------- |
| 2026-09-01 | 0.1      | Codex / TBD      | Initial Proposed Profile specification                                                       |
| 2026-09-01 | 0.2      | Product decision | Chốt displayName 100 ký tự, signed URL R2, async avatar cleanup và ẩn profile LOCKED/PENDING |
| 2026-09-01 | 0.3      | Product owner    | Approved ID-002 Profile specification                                                        |
| 2026-09-01 | 0.4      | Product owner    | Chốt bio tối đa 1.000 ký tự và quy tắc xử lý Unicode                                         |

> `spec.md` describes WHAT. Detailed folders, classes, DTO implementations, R2 adapters, database
> mappings and execution order belong in a future `plan.md` after human approval.
