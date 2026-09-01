# BKPractice Spec-Driven Development

This directory defines the Spec-Driven Development (SDD) workflow for future BKPractice work. It
does not replace the authoritative architecture documentation in [`docs/architecture`](../docs/architecture/system-architecture.md).

## Artifact responsibilities

```text
Requirement
    |
    v
spec.md (WHAT)
    |
    v
Review -> Approved
    |
    v
plan.md (HOW)
    |
    v
tasks.md (implementation checklist)
    |
    v
Implementation -> Tests -> Verification against spec.md and architecture
```

- `spec.md` defines required behavior, rules, inputs, outputs, failures, acceptance criteria and
  explicit exclusions. An Approved spec is the feature source of truth.
- `plan.md` explains how the Approved spec will be implemented inside the target service's selected
  architecture. It cannot add requirements or broaden scope.
- `tasks.md` is the ordered, updateable execution checklist derived from the plan. It cannot change
  the plan or spec.

When instructions conflict, use this precedence:

```text
System architecture constraints + Approved spec.md
    > plan.md
    > tasks.md
    > implementation assumptions
```

An architecture-conflicting spec must not be approved or implemented silently. Report the conflict
and obtain an explicit architecture/spec decision. An implementation agent must not edit an
Approved spec unless explicitly instructed to revise the specification.

## Status lifecycle

Allowed spec statuses are `Proposed`, `Approved`, `Implemented`, and `Verified`.

1. `Proposed`: open to requirement review and revision; implementation is blocked.
2. `Approved`: reviewed source of truth; planning and implementation may proceed.
3. `Implemented`: applicable tasks and tests are complete, pending final verification.
4. `Verified`: implementation has been checked against acceptance criteria and architecture.

Only an authorized reviewer may approve or revise requirements. Implementation work does not imply
approval.

## Agent workflow

Before implementation, an agent MUST:

1. Read the system and target-service documents under `docs/architecture/`.
2. Read the feature `spec.md`.
3. Confirm `Status = Approved`.
4. Read `plan.md`.
5. Read `tasks.md`.
6. Inspect the existing source and current repository state.

During implementation, an agent MUST:

7. Follow the selected service architecture and dependency rules.
8. Work through `tasks.md` incrementally.
9. Not change approved requirements.
10. Not add Out-of-Scope functionality.
11. Not introduce architecture changes without explicit approval.
12. Keep `tasks.md` current, marking completed and applicable N/A items honestly.

After implementation, an agent MUST:

13. Run relevant tests.
14. Run the validation commands required by the feature.
15. Compare the implementation with `spec.md`.
16. Compare the implementation with the service architecture and dependency rules.
17. Report deviations, unverified behavior and remaining risks.

If any required artifact is missing, contradictory or ambiguous in a way that changes behavior, the
agent stops that implementation path and reports the issue instead of inventing a requirement.

## Feature placement and identifiers

Each feature lives in the predefined service/domain folder and eventually contains:

```text
<feature>/
├── spec.md
├── plan.md
└── tasks.md
```

| Prefix  | Owning service | Examples                                                                                                               |
| ------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `ID-*`  | Identity       | `ID-001 Authentication`, `ID-002 Profile`, `ID-003 RBAC`                                                               |
| `LRN-*` | Learning       | `LRN-001 Problem Management`, `LRN-002 Course Management`, `LRN-003 Assignment Management`, `LRN-004 Progress`         |
| `SUB-*` | Submission     | `SUB-001 Run Code`, `SUB-002 Submit Code`, `SUB-003 Submission History`, `SUB-004 Realtime Result`                     |
| `JDG-*` | Judge          | `JDG-001 Standard Judge`, `JDG-002 Language Runners`, `JDG-003 Function Judge`, `JDG-004 OOP Judge`, `JDG-005 Sandbox` |
| `COM-*` | Community      | `COM-001 Posts`, `COM-002 Comments`, `COM-003 Reactions`, `COM-004 Bookmarks`, `COM-005 Moderation`                    |

Identifiers are stable after approval and are not reused. The examples reserve naming conventions;
they do not constitute implemented or Approved feature specifications.

## Example: ID-001 Authentication

Start by copying [`spec.template.md`](./templates/spec.template.md) to
`01-identity/authentication/spec.md`, set the feature ID to `ID-001`, and describe authentication
requirements only. Its required architecture is **Identity Service: Clean Architecture**.

After review changes the spec status to `Approved`, create `plan.md` from the plan template. The
plan maps the requirements to Identity domain/application ports and infrastructure adapters without
expanding scope. Then create `tasks.md`; implementation may begin only after all three artifacts are
consistent.

The same rule applies to other prefixes:

- `SUB-*`: Clean Architecture + Event-Driven Architecture.
- `JDG-*`: Worker Architecture + Pipeline Architecture + Adapter Pattern.
- `COM-*`: Clean Architecture + Modular Domain Architecture.

The complete service matrix is in [`00-system/architecture-reference.md`](./00-system/architecture-reference.md).
