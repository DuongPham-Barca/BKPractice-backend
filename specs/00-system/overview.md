# BKPractice SDD System Overview

## Purpose

This section records system-wide constraints that every BKPractice feature specification, plan and
task list must follow. It is SDD governance, not a replacement for the authoritative architecture
under [`docs/architecture`](../../docs/architecture/system-architecture.md).

## Required development flow

```text
Requirement -> spec.md -> Review -> Approved -> plan.md -> tasks.md
            -> Implementation -> Tests -> Spec and architecture verification
```

The three feature artifacts have distinct responsibilities:

- `spec.md`: WHAT behavior is required and excluded.
- `plan.md`: HOW the Approved behavior fits the owning service and its architecture.
- `tasks.md`: the implementation and verification checklist derived from the plan.

Implementation is blocked until the spec is Approved and all three artifacts agree. Approved
requirements are not edited as an implementation convenience.

## Authority

System architecture constraints and an Approved feature spec are binding. A plan cannot broaden a
spec; tasks cannot broaden a plan; code assumptions cannot override any artifact. When a spec and
architecture appear incompatible, report the conflict for an explicit decision rather than
changing a boundary silently.

## System references

- [Architecture reference](./architecture-reference.md)
- [Service boundaries](./service-boundaries.md)
- [Roles and permissions](./roles-permissions.md)
- [Database strategy](./database-strategy.md)
- [Communication](./communication.md)
- [Judge security](./judge-security.md)
- [Definition of Done](./definition-of-done.md)
- [Agent workflow and feature IDs](../README.md)
