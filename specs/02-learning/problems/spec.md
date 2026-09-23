# LRN-001 Problem Management

## Status

Proposed

Allowed values: `Proposed` | `Approved` | `Implemented` | `Verified`

## Goal

Allow authorized teaching staff to create and manage programming problems and allow learners to
discover and read published problems, while preserving Learning Service ownership, protecting
hidden judge material, and providing stable problem metadata for future Assignment, Submission,
Judge, Progress, and Recommendation features.

## Actors

- **STUDENT:** An authenticated learner who discovers and reads problems available under the
  approved visibility policy.
- **LECTURER:** An authenticated teaching user who may create and manage problems when the required
  Learning permission and resource-ownership policy allow it.
- **ADMIN:** An authenticated platform administrator. `ADMIN` has no implicit Problem content
  authority; any Problem-management capability must be explicitly approved by this specification.
- **Unauthenticated visitor:** A caller without trusted identity context. Whether this actor may
  read the published problem catalog is an unresolved product decision.
- **API Gateway:** The public entry point that verifies BKPractice access tokens, removes
  caller-supplied trusted identity headers, and forwards verified identity/role context.
- **Learning Service:** The owner of Problem state, policy, metadata, statements, Topic/Tag
  associations, supported problem languages, starter code, execution limits, and Test Case
  relationships.
- **Submission Service:** A trusted consumer of a protected Learning-owned judge package. It stores
  only the external Problem ID and never reads the Learning database directly.
- **Judge Service:** A trusted compute worker that receives approved execution input through the
  Submission workflow. It does not own Problem state.

## Context

Problem Management is the first Learning feature specification. Learning uses **Clean
Architecture + Modular Domain Architecture** and owns Problems together with Test Cases, Topics,
Tags, starter code, supported problem languages, Courses, Assignments, Progress, and
Recommendation. LRN-001 defines the Problem lifecycle and public/management behavior without
splitting a new Problem service or implementing adjacent Learning features.

The existing foundation establishes the following vocabulary and model constraints, which LRN-001
reuses rather than duplicating:

- Problem types: `STANDARD`, `FUNCTION`, and `OOP`.
- Difficulty values: `EASY`, `MEDIUM`, and `HARD`.
- Lifecycle states: `DRAFT`, `PUBLISHED`, and `ARCHIVED`.
- A stable UUID-like internal Problem identifier and a unique human-readable slug.
- Learning-owned Topic and Tag associations.
- A per-Problem subset of the approved Judge-supported language catalog.
- Per-language starter code and an internal hidden-harness boundary.
- Positive per-Problem time and memory limits supplied through the protected judge workflow.
- An external `createdBy` Identity user identifier, with no cross-service database relation.

The current source is foundation behavior, not an Approved LRN-001 specification. Existing routes
or persistence shapes do not authorize unresolved product policy. They may require later
alignment only after this specification is approved and a plan/tasks phase is completed.

## Functional Requirements

- **LRN-001-FR-001 — Learning ownership:** Learning MUST own every Problem and its Problem-side
  policy. Submission and Judge MUST reference a Problem by stable external ID and MUST NOT own or
  directly persist the Learning Problem entity.
- **LRN-001-FR-002 — Stable identity:** Every Problem MUST have a unique, stable identifier that
  remains usable by Assignment and Submission history. A title MUST NOT serve as Problem identity.
- **LRN-001-FR-003 — Approved problem types:** A Problem MUST use exactly one approved type:
  `STANDARD`, `FUNCTION`, or `OOP`. Unknown or caller-defined types MUST be rejected.
- **LRN-001-FR-004 — Draft creation:** An authorized LECTURER MUST be able to create a Problem in
  `DRAFT` state. Creation MUST derive the creator from trusted authentication context and MUST NOT
  accept an authoritative creator ID from the client.
- **LRN-001-FR-005 — Draft isolation:** A `DRAFT` Problem MUST NOT appear in learner-facing lists,
  searches, filters, or detail responses. Management visibility remains subject to the approved
  owner/Admin policy.
- **LRN-001-FR-006 — Published discovery:** A STUDENT permitted by the approved catalog-visibility
  policy MUST be able to list and retrieve `PUBLISHED` Problems.
- **LRN-001-FR-007 — Search:** Published Problem discovery MUST support case-insensitive search by
  title and exact lookup by stable identifier or slug without exposing non-published Problems.
- **LRN-001-FR-008 — Filtering and pagination:** Published Problem listing MUST support pagination
  and filtering by approved Problem type, difficulty, Topic, and Tag. Empty result sets MUST be
  successful and MUST NOT reveal Draft/Archived counts.
- **LRN-001-FR-009 — Management reads:** An authorized Problem manager MUST be able to retrieve the
  management representation of Problems they are permitted to manage, including Draft content and
  publish-readiness information but excluding raw hidden Test Case answers unless a later Test Case
  specification authorizes that data.
- **LRN-001-FR-010 — Authorized update:** An authorized Problem manager MUST be able to update only
  Problem fields permitted by the approved lifecycle and ownership policy. Client input MUST NOT
  change the creator or bypass a state transition.
- **LRN-001-FR-011 — Publish transition:** An authorized Problem manager MUST be able to request the
  `DRAFT` to `PUBLISHED` transition. Publication MUST be atomic and MUST fail without changing state
  when any approved publish precondition is unmet.
- **LRN-001-FR-012 — Publish validation:** Before publication, the system MUST validate a non-empty
  title and statement, approved type and difficulty, a unique valid slug, positive execution
  limits, at least one enabled approved language, and the required type-specific Problem contract.
  The unresolved Test Case/starter-code readiness conditions are recorded in Open Questions.
- **LRN-001-FR-013 — Archived discovery behavior:** An `ARCHIVED` Problem MUST be excluded from new
  learner discovery while retaining its stable identity for historical references. Exact access
  and transition policy is unresolved and MUST be approved before implementation.
- **LRN-001-FR-014 — Problem statement:** A Problem MUST provide a title, main statement, visible
  examples, constraints where applicable, and type-appropriate contract information. A
  `STANDARD` Problem additionally MUST describe its input and output contract before publication.
- **LRN-001-FR-015 — Visible examples:** Learner-facing examples MUST be distinguishable from Test
  Cases and MUST contain only content intentionally visible to learners. Visible examples MUST NOT
  expose hidden expected outputs, harnesses, or internal solutions.
- **LRN-001-FR-016 — Difficulty:** Every Problem MUST use one of `EASY`, `MEDIUM`, or `HARD`.
  Difficulty is Problem metadata for discovery and future Recommendation; it is not a Judge result.
- **LRN-001-FR-017 — Topic and Tag associations:** A Problem MAY be associated with zero or more
  Learning-owned Topics and Tags. Invalid or unknown references MUST NOT be silently created by a
  Problem request.
- **LRN-001-FR-018 — Supported languages:** A Problem MUST use only values from the approved shared
  Judge-supported language catalog. A published Problem MUST enable at least one supported
  language, and a caller MUST NOT provide compiler commands or runtime configuration as a language.
- **LRN-001-FR-019 — Starter-code boundary:** A Problem MAY provide learner-visible starter code
  for an enabled language. Starter code for a disabled language MUST NOT be advertised, and hidden
  harness content MUST NOT be returned in learner-facing responses.
- **LRN-001-FR-020 — Execution limits:** Each Problem MUST define positive time and memory limits
  within approved platform safety bounds. Learning owns the Problem-specific values; Judge remains
  responsible for enforcing sandbox limits and MAY apply stricter platform ceilings.
- **LRN-001-FR-021 — Slug:** Every Problem MUST have a unique valid slug for human-readable lookup.
  Slug generation/editability and published-slug stability require product approval.
- **LRN-001-FR-022 — Creator reference:** Learning MUST store the creator as an external Identity
  user ID without a cross-service foreign key or duplicated User/Profile data.
- **LRN-001-FR-023 — Observable metadata:** A Problem management representation MUST expose its
  current lifecycle state and basic creation/update timestamps. Public responses MUST expose only
  metadata approved for learners.
- **LRN-001-FR-024 — Preview:** An authorized Problem manager MUST be able to preview the
  learner-visible representation of an authorized Draft without publishing it. Preview MUST NOT
  execute code or make the Problem visible to learners.
- **LRN-001-FR-025 — Public/internal separation:** Learner-facing Problem responses MUST use a
  public allowlist and MUST NOT expose hidden Test Cases, expected hidden outputs, hidden harnesses,
  internal solutions, compiler/Docker commands, or internal service credentials.
- **LRN-001-FR-026 — Trusted judge-data boundary:** Any hidden Problem/Test Case material needed by
  Submission/Judge MUST be available only through the approved protected internal workflow. Public
  clients MUST NOT be able to obtain that material by changing routes, parameters, headers, or
  requested language.
- **LRN-001-FR-027 — Assignment compatibility:** Assignment MAY reference a Problem only through
  its stable Learning-owned ID. LRN-001 MUST NOT own deadlines, class assignment, grading policy,
  or Assignment progress.
- **LRN-001-FR-028 — No execution or submission ownership:** Problem Management MUST NOT compile or
  run code, create a Run/Submit record, classify execution results, store submission source/history,
  or publish realtime results.
- **LRN-001-FR-029 — Content safety:** User-authored Problem content MUST be returned in a form that
  can be rendered without executing unsafe embedded content. The exact content format and
  sanitization ownership must be resolved before approval.
- **LRN-001-FR-030 — Deterministic retries:** A failed validation, authorization check, or state
  transition MUST leave Problem state unchanged. Repeating a read MUST not mutate the Problem.

## Business Rules

### Lifecycle

| State       | Learner discovery | Meaning                                                                  |
| ----------- | ----------------- | ------------------------------------------------------------------------ |
| `DRAFT`     | Never             | Work in progress; may be incomplete beyond the minimum creation fields   |
| `PUBLISHED` | Yes               | Passed approved publish validation and is available under visibility     |
| `ARCHIVED`  | No                | Removed from new discovery while its stable identity/history is retained |

- A newly created Problem starts in `DRAFT`.
- Publication is an explicit transition; saving a Draft never publishes it implicitly.
- A failed publication attempt preserves the prior state and reports missing/invalid conditions.
- State changes are business operations, not arbitrary editable request fields.
- Unpublish, Archive, restoration, and hard-delete policies remain unresolved. No hard-delete
  capability is required by this Proposed revision.

### Minimum creation data

To remain compatible with the current foundation, Draft creation requires:

- a title of at most 200 characters;
- a unique valid slug of at most 220 characters;
- a non-empty main statement/description;
- one approved Problem type;
- one approved difficulty; and
- trusted creator identity.

A Draft may defer publish-only completeness such as enabled languages, final examples, type-specific
contract details, starter code, execution-limit confirmation, and Test Case readiness according to
the decisions recorded in this specification.

### Common Problem data

- The title is display metadata and need not be globally unique; the slug is unique.
- The statement contains the learner-facing task. Input/output sections are mandatory for
  `STANDARD` and may be not applicable to a `FUNCTION`/`OOP` contract.
- Visible examples explain the task and are never treated as hidden Test Cases.
- Constraints describe business/problem constraints, not Docker or compiler commands.
- Topics represent Learning/syllabus taxonomy. Tags are flexible Learning metadata. Their
  management lifecycle is separate from the Problem update payload.
- The current approved language catalog is C, C++, Java, and Python as represented by the shared
  technical values `c`, `cpp`, `java`, and `python`. LRN-001 does not redefine language runners.
- Starter code is learner-visible source scaffolding. A hidden harness is internal judge material,
  not starter code and never part of a public response.
- Time and memory limits are Learning-owned Problem configuration passed through trusted contracts;
  Judge owns enforcement and security ceilings.
- Problem score/max points is not a common Problem field in LRN-001. Assignment-specific maximum
  score belongs to Assignment, while Test Case weights belong to the future Test Case feature.

### Type-specific behavior

- **STANDARD:** The learner writes a complete program. A published Problem requires a statement,
  input specification, output specification, type-appropriate visible examples, constraints where
  applicable, execution limits, and at least one enabled language.
- **FUNCTION:** The learner implements a function/method under an explicit callable contract. The
  published statement MUST unambiguously describe the callable name, inputs/parameters, result,
  and behavior for every enabled language. Contract representation and mandatory starter-code
  policy remain Open Questions.
- **OOP:** The learner implements required object-oriented structure. The published statement MUST
  unambiguously describe required classes/interfaces, constructors where applicable, methods,
  parameters, return behavior, and relevant visibility constraints for every enabled language.
  Contract representation and mandatory starter-code policy remain Open Questions.

### Historical integrity

- Stable Problem IDs must remain valid for Assignment and Submission references.
- Problem Management does not modify Submission history when content or lifecycle changes.
- A title or display metadata change never changes Problem identity.
- Policy for editing a published Problem with Test Cases, Assignments, or Submissions is unresolved;
  implementation MUST NOT invent versioning or destructive behavior before approval.

## Authorization Rules

- Published catalog/detail access follows the approved visibility decision. At minimum, an
  authenticated `STUDENT` with valid trusted context may read Problems available to them.
- `STUDENT` MUST NOT create, update, preview, publish, archive, restore, or delete a Problem and
  MUST NOT access Draft or hidden internal material.
- An authenticated `LECTURER` with `problem:create` MAY create a Draft.
- Management reads, updates, publication, and archive-like transitions require explicit
  feature permissions using ID-003's `resource:action` convention plus the approved creator/resource
  ownership policy. Proposed identifiers are `problem:read-managed`, `problem:update`,
  `problem:publish`, and `problem:archive`.
- Whether a Lecturer may manage only self-created Problems or all Problems remains unresolved.
- `ADMIN` is not automatically a Problem editor/publisher. Admin capabilities require an explicit
  decision and the same server-side validation as every other actor.
- The Gateway may perform authentication and coarse route checks. Learning MUST enforce final
  Problem authorization, ownership, lifecycle, and field policy at a trusted backend boundary.
- Learning MUST derive actor identity and roles from verified Gateway/service context. Client body,
  query, route, or headers cannot establish trusted creator, role, permission, or ownership.
- Submission may obtain hidden judge material only as a trusted service actor under the approved
  internal communication contract. This does not grant it Problem-management authority.
- Missing or ambiguous Problem authorization defaults to deny under ID-003.

## Inputs

The routes below are conceptual operations, not a final controller design. Exact naming and DTO
implementation belong in a future Approved plan.

### Create Draft Problem

Requires trusted authenticated Lecturer context with `problem:create` and accepts:

- title;
- slug or the data required by the approved slug-generation policy;
- main statement/description;
- one approved type;
- one approved difficulty; and
- optional initial public metadata allowed for a Draft.

It MUST NOT accept authoritative `createdBy`, lifecycle timestamps, hidden Test Case answers,
trusted service identity, compiler commands, Docker arguments, role, or permission fields.

### Update authorized Problem

Accepts an explicit allowlist drawn from:

- title, slug subject to the approved slug policy, and statement sections;
- type subject to the approved type-immutability policy;
- difficulty;
- visible examples and constraints;
- Topic/Tag references;
- enabled supported languages;
- learner-visible starter code per enabled language; and
- positive time/memory limits within platform bounds.

Lifecycle transitions are separate actions and MUST NOT occur through mass assignment.

### Publish Problem

Accepts the stable Problem identifier and trusted actor context. The current stored Problem state,
not caller assertions, determines publish readiness.

### Problem discovery/detail

Accepts only documented pagination, search, filter, identifier, or slug values. Caller-supplied
publish state, creator, roles, hidden-data flags, or internal-service flags MUST NOT broaden the
result.

### Preview

Accepts an authorized Problem identifier and returns the public-shaped rendering without changing
state. It does not accept source code for execution.

## Outputs

- Draft creation returns the stable Problem identifier, current `DRAFT` state, safe management
  metadata, and validation/readiness information without hidden Test Case answers.
- Published listing returns a paginated collection of public summaries containing the stable ID,
  slug, title, type, difficulty, approved Topic/Tag summaries, enabled languages, and approved
  timestamps. It excludes Draft/Archived items and hidden/internal fields.
- Published detail returns the learner-visible statement, type-specific contract, visible examples,
  constraints, limits appropriate for display, enabled languages, and learner-visible starter code.
- Management detail may include lifecycle state and publish-readiness failures but does not obtain
  role/profile data from Identity storage and does not return raw hidden Test Case answers through
  LRN-001.
- Preview returns the same learner-facing shape that publication would expose without changing
  lifecycle state or catalog visibility.
- Successful publication returns the resulting `PUBLISHED` state and safe Problem representation.
- Hidden judge material is never included in public/management responses merely because the caller
  knows the Problem ID or enabled language.
- LRN-001 emits no mandatory domain event in this revision. Future Assignment/Recommendation event
  needs require their own approved specification.

## Error Cases

| Case                                                        | Observable behavior                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Missing or invalid authentication on protected operation    | Existing Gateway/authentication convention returns `401`; no state changes                         |
| Authenticated actor lacks permission/ownership              | Existing forbidden convention returns `403`; no state changes                                      |
| Problem does not exist or is not visible to caller          | Existing not-found/visibility convention returns `404` without leaking non-public state            |
| Unknown type, difficulty, language, Topic, or Tag           | Validation/business error; no Problem state changes                                                |
| Duplicate or invalid slug                                   | Existing conflict/validation convention; no duplicate Problem is created                           |
| Malformed pagination/search/filter input                    | Existing validation convention returns a client error; no hidden data is exposed                   |
| Publication requested for a non-Draft or incomplete Problem | State-transition/publish-validation failure; prior state is preserved                              |
| Unauthorized creator/state fields supplied                  | Fields are rejected or ignored by allowlist validation and cannot affect authorization/state       |
| Disabled/unsupported language starter code is supplied      | Validation failure; no inconsistent starter-code state is persisted                                |
| Non-positive or unsafe execution limit is supplied          | Validation failure; Problem state is unchanged                                                     |
| Draft/Archived ID is requested through learner API          | Not-found/visibility response that does not reveal non-public content or state                     |
| Hidden/internal material requested through public API       | Request is denied or the field is omitted; no hidden material is returned                          |
| Concurrent update/state transition conflicts                | No partial state is exposed; behavior follows the approved concurrency policy once defined         |
| Unexpected persistence or dependency failure                | Existing normalized error convention with no hidden content, credentials, or cross-service details |

LRN-001 does not introduce a new error envelope. Transport serialization follows the existing
Gateway/Learning/NestJS convention.

## Edge Cases

- Two concurrent Draft creations cannot produce the same slug; at most one succeeds for a unique
  slug.
- A Problem may have no Topics or Tags unless publish policy later requires one; empty filters
  remain valid.
- A Topic or Tag removed by its owning Learning workflow must not silently expose or corrupt a
  Problem response.
- Removing an enabled language must not leave learner-visible starter code advertised for that
  language.
- Changing type or language after Test Cases or Submissions exist may invalidate a contract; the
  operation remains blocked by an Open Question rather than receiving invented behavior.
- A Draft preview never changes timestamps/state beyond behavior explicitly associated with a read.
- Search and filter never reveal that a matching Draft or Archived Problem exists.
- Unicode Vietnamese titles/statements remain supported; slug normalization must preserve uniqueness
  without using title as identity.
- Archived/unpublished content remains excluded from new learner discovery even when referenced by
  historical Assignment/Submission data.
- A stricter Judge platform ceiling may reject a Problem limit that is positive but unsafe; a
  Problem cannot weaken Judge security constraints.
- Hidden harnesses and expected outputs remain hidden even if they are present in current
  persistence or requested by an `ADMIN` through a public Problem operation.

## Security Requirements

- **LRN-001-SR-001 — Server-side authorization:** Learning MUST enforce Problem permissions,
  ownership, field policy, and lifecycle transitions at a trusted backend boundary; frontend UI is
  not a security control.
- **LRN-001-SR-002 — Trusted actor context:** Creator and actor identity MUST come only from the
  verified Gateway/service context. Client-supplied identity, role, permission, ownership, or
  trusted internal headers MUST NOT influence authorization.
- **LRN-001-SR-003 — Draft confidentiality:** Draft and management-only content MUST NOT be exposed
  by public list, search, filter, detail, error, or count behavior.
- **LRN-001-SR-004 — Hidden judge-data confidentiality:** Hidden Test Cases, expected outputs,
  harnesses, internal solutions, and execution internals MUST NOT appear in public or ordinary
  management responses, logs, errors, or Swagger examples.
- **LRN-001-SR-005 — Internal endpoint protection:** Protected judge material MUST be returned only
  to an authenticated trusted service through the approved internal contract; public callers and
  spoofed internal headers MUST be rejected.
- **LRN-001-SR-006 — Mass-assignment prevention:** Problem input MUST explicitly allowlist mutable
  fields. Creator, timestamps, lifecycle state, hidden-data flags, role, and permission cannot be
  changed through arbitrary request fields.
- **LRN-001-SR-007 — Content safety:** Problem content MUST be validated and rendered so embedded
  script, unsafe HTML, malicious links, or equivalent payloads cannot execute in a learner or
  manager client.
- **LRN-001-SR-008 — Runtime-command isolation:** Problem language/limit/starter-code input MUST NOT
  become client-controlled compiler, shell, filename, Docker, network, or sandbox commands.
- **LRN-001-SR-009 — Service/database isolation:** Learning MUST NOT query Identity, Submission, or
  Judge databases or create cross-service foreign keys. Other services MUST NOT query
  `bkpractice_learning` directly.
- **LRN-001-SR-010 — Output allowlisting:** Public Problem responses MUST be explicitly mapped and
  MUST NOT serialize persistence entities in a way that leaks select-hidden or newly added internal
  fields.
- **LRN-001-SR-011 — Safe logging:** Authentication headers, service secrets, hidden judge material,
  full sensitive request bodies, and untrusted rendered content MUST NOT be written to logs/errors.
- **LRN-001-SR-012 — Safe failure/default deny:** Missing, stale, malformed, or ambiguous
  authorization/visibility context MUST fail closed and preserve prior Problem state.

## Acceptance Criteria

- **LRN-001-AC-001:** Given an authorized Lecturer, when they create valid minimum Problem data,
  then one Problem is created in `DRAFT` with a stable ID and trusted creator reference.
- **LRN-001-AC-002:** Given a Student or public catalog caller, when Problems are listed or searched,
  then only Problems visible under the approved policy and in `PUBLISHED` state are returned.
- **LRN-001-AC-003:** Given a Draft or Archived Problem matching a search/filter, when learner
  discovery runs, then its content and existence are not revealed in results or counts.
- **LRN-001-AC-004:** Given a published Problem, when an authorized learner retrieves it by stable
  ID or slug, then the approved public statement, metadata, languages, limits, examples, and starter
  code are returned.
- **LRN-001-AC-005:** Given an unauthenticated or unauthorized actor, when a protected Problem
  management action is requested, then it receives `401` or `403` as applicable and no state changes.
- **LRN-001-AC-006:** Given a Student, when create/update/preview/publish/archive/delete is attempted,
  then the operation is denied and the Problem remains unchanged.
- **LRN-001-AC-007:** Given a Problem update containing creator, lifecycle, role, permission,
  hidden-data, or unknown fields, when validation runs, then those fields cannot change Problem
  state.
- **LRN-001-AC-008:** Given a Draft missing any approved publish prerequisite, when publication is
  requested, then publication fails atomically and the Problem remains `DRAFT`.
- **LRN-001-AC-009:** Given a complete Draft satisfying all approved prerequisites, when an
  authorized manager publishes it, then its state becomes `PUBLISHED` and it becomes discoverable
  under the approved visibility policy.
- **LRN-001-AC-010:** Given a Problem type outside `STANDARD`, `FUNCTION`, or `OOP`, when creation or
  update is attempted, then validation rejects it without changing state.
- **LRN-001-AC-011:** Given a difficulty outside `EASY`, `MEDIUM`, or `HARD`, when creation or update
  is attempted, then validation rejects it without changing state.
- **LRN-001-AC-012:** Given a language outside the approved shared catalog or a Problem with no
  enabled language, when publication is attempted, then it is rejected without changing state.
- **LRN-001-AC-013:** Given a `STANDARD` Problem without a complete input/output contract, when
  publication is requested, then it is rejected without changing state.
- **LRN-001-AC-014:** Given a `FUNCTION` or `OOP` Problem, when publication is requested, then its
  type-specific callable/structural contract is validated for every enabled language under the
  approved representation policy.
- **LRN-001-AC-015:** Given learner-visible examples, when public Problem detail is returned, then
  the examples are present but hidden Test Cases, hidden expected outputs, harnesses, and internal
  solutions are absent.
- **LRN-001-AC-016:** Given starter code for a disabled or unsupported language, when update or
  publication validation runs, then inconsistent configuration is rejected or made non-public
  without leaking hidden harness data.
- **LRN-001-AC-017:** Given non-positive or platform-unsafe time/memory limits, when validation runs,
  then the request is rejected and existing values remain unchanged.
- **LRN-001-AC-018:** Given a duplicate slug, when a concurrent create/update attempts to persist it,
  then at most one Problem owns the slug and the conflicting operation fails safely.
- **LRN-001-AC-019:** Given an authorized Draft preview, when it is requested, then the learner-facing
  representation is returned without publication, execution, or public discovery.
- **LRN-001-AC-020:** Given a public Problem response, error, log, or Swagger example, when inspected,
  then it contains no hidden Test Case, expected hidden output, harness, internal solution,
  credential, or runtime command.
- **LRN-001-AC-021:** Given a trusted Submission request for judge data, when the approved internal
  authentication is absent or spoofed, then Learning returns no hidden Problem/Test Case material.
- **LRN-001-AC-022:** Given an Assignment or Submission reference, when Problem identity is used,
  then it remains an external stable ID and no cross-service database relation/query is introduced.
- **LRN-001-AC-023:** Given Problem Management behavior, when service ownership is inspected, then
  Learning owns Problem persistence and no Problem/Judge/Recommendation microservice is added.
- **LRN-001-AC-024:** Given malicious statement content, when it is validated and rendered through
  the approved content contract, then it cannot execute unsafe embedded content.
- **LRN-001-AC-025:** Given a failed validation, authorization check, or state transition, when the
  operation completes, then no partial Problem mutation is committed.

## Out of Scope

- Test Case CRUD, hidden Test management, expected-output editing, Test Case weights, custom
  checkers, and Test Case import/export
- Judge compilation, execution, sandboxing, runner selection, harness generation, comparison, and
  result classification
- Run Code, Submit Code, submission lifecycle/history, source-code persistence, and realtime results
- Course, Chapter, Class, Enrollment, Assignment, deadline, grading, and Assignment progress
  management
- Solved status, Learning progress, score aggregation, and Recommendation behavior
- Problem version history, collaborative editing, optimistic-lock UI, review committees, and
  multi-stage content approval
- Editorials, official solutions, plagiarism detection, AI authoring/solution generation, and
  problem marketplace
- Elasticsearch or another external full-text search engine
- Import from online judges or external Problem catalogs
- Runtime Topic/Tag administration beyond associating existing Learning-owned values
- Human-readable numbering systems separate from the existing stable ID and slug
- Problem-level maximum score; Assignment and Test Case scoring remain separate
- Hard-delete behavior until historical-integrity policy is explicitly approved
- New Problem, Topic, Recommendation, or content-management microservices

## Dependencies

- [BKPractice system architecture](../../../docs/architecture/system-architecture.md)
- [Learning Service architecture](../../../docs/architecture/learning-service.md)
- [Service architecture matrix](../../../docs/architecture/service-architectures.md)
- [Dependency rules](../../../docs/architecture/dependency-rules.md)
- [ADR 0001: Service-specific Internal Architectures](../../../docs/adr/0001-service-specific-internal-architectures.md)
- [SDD workflow](../../README.md)
- [Architecture reference](../../00-system/architecture-reference.md)
- [Service boundaries](../../00-system/service-boundaries.md)
- [Roles and permissions](../../00-system/roles-permissions.md)
- [Database strategy](../../00-system/database-strategy.md)
- [Communication strategy](../../00-system/communication.md)
- [Judge security](../../00-system/judge-security.md)
- [Definition of Done](../../00-system/definition-of-done.md)
- [ID-001 Authentication](../../01-identity/authentication/spec.md) for authenticated identity,
  trusted Gateway context, account-status behavior, and role claims.
- [ID-003 RBAC](../../01-identity/rbac/spec.md) for default-deny, `resource:action` permission naming,
  role semantics, and service-owned resource authorization.
- Future Learning Test Case specification for hidden Test Case lifecycle, readiness, weights,
  harnesses, expected outputs, and publish dependency.
- Future Assignment specification for Problem references, availability rules, and scoring.
- Future Submission/Judge specifications for protected judge packages and execution behavior.

## Open Questions

The following product decisions are not resolved by Architecture, System SDD, Approved Identity
specifications, or the current foundation. They block approval where they affect required behavior:

1. **Lecturer ownership:** May a Lecturer update/publish/archive only Problems they created, all
   Problems, or Problems shared through a future Course ownership policy?
2. **Admin content authority:** May `ADMIN` view/manage all Problems, or does Admin remain outside
   normal Problem authoring unless separately granted a Learning permission?
3. **Catalog audience:** Are `PUBLISHED` Problems readable only by authenticated users, or is the
   published catalog/detail public to unauthenticated visitors?
4. **Lifecycle transitions:** Is `PUBLISHED -> DRAFT` unpublish allowed? Who may archive/restore,
   and may an Archived Problem remain readable through an existing Assignment/history link?
5. **Draft assignment:** May a Draft Problem be attached to an unpublished/future Assignment, or
   may Assignment reference only Published Problems?
6. **Published edits and type immutability:** Which fields may change after publication? Must type,
   language contract, slug, limits, and statement become immutable after Test Cases, Assignments,
   or Submissions exist?
7. **Historical changes:** If material published content may change after Submissions exist, is
   simple in-place editing acceptable or is Problem versioning required? Versioning is currently
   Out of Scope unless explicitly approved.
8. **Deletion:** Is Archive the only removal mechanism, or is hard delete allowed for an unused
   Draft with no Test Cases/Assignment/Submission references?
9. **Content format:** Is the statement authored as Markdown, plain text, or restricted rich text,
   and which layer owns sanitization for safe rendering?
10. **Publish/Test Case readiness:** Must a Problem have at least one approved Test Case before
    publication, and do the required counts/visibility differ by Problem type?
11. **Starter code:** Is starter code mandatory for `FUNCTION` and `OOP`, and must it exist for every
    enabled language? Is it optional for `STANDARD`?
12. **FUNCTION/OOP contract representation:** Is each contract language-neutral with per-language
    adapters/starter code, or is the complete callable/class contract defined separately per
    enabled language?
13. **Slug policy:** Is slug supplied by the Lecturer or generated from title? Can it change while
    Draft, and is it immutable after publication?
14. **Topic/Tag policy:** Are both Topic and Tag required in v1, who manages their catalogs, and is
    at least one Topic required for publication?
15. **Visibility model:** Are all Published Problems globally visible in v1, or is `COURSE_ONLY`
    visibility required now rather than deferred to Course/Assignment specifications?

## Revision History

| Date       | Revision | Author/Reviewer | Summary                                           |
| ---------- | -------- | --------------- | ------------------------------------------------- |
| 2026-09-02 | 0.1      | Codex / TBD     | Initial Proposed Problem Management specification |

> `spec.md` describes WHAT. Controllers, DTOs, entities, repositories, migrations, query strategy,
> storage shape, sanitization libraries, service contracts, and execution order belong in a future
> `plan.md` after human approval.
