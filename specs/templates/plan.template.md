# [FEATURE-ID] Implementation Plan

## Related Specification

<!-- Link the Approved spec.md and record its revision/date. Do not plan against Proposed status. -->

## Target Service

Service: [API Gateway | Identity | Learning | Submission | Judge | Community]

## Required Service Architecture

Architecture: [Copy the exact architecture from architecture-reference.md]

This section is mandatory. Read the target-service architecture and dependency rules before
planning.

## Existing Code Impact

<!-- Identify current modules/flows affected and behavior that must remain compatible. -->

## Domain Changes

<!-- Domain rules, entities/value objects or state transitions. Use N/A when not applicable. -->

## Application / Use Cases

<!-- Application operations and ports needed to implement only the Approved requirements. -->

## Persistence

<!-- Repository/adaptor behavior and database ownership. Do not introduce cross-service access. -->

## Database Changes

<!-- Tables, columns, indexes and compatibility effects, or N/A. -->

## Migration

<!-- TypeORM migration and rollout/revert approach, or N/A. -->

## API

<!-- Routes, methods, request/response contracts and compatibility, or N/A. -->

## DTO / Validation

<!-- Input validation, transformation and output exposure rules. -->

## Authorization

<!-- Required roles, permissions, ownership and trusted service checks. -->

## Messaging / Events

<!-- Exchanges, queues, routing keys, contracts, delivery/idempotency behavior, or N/A. -->

## Realtime

<!-- Socket.IO/Redis behavior and persistent fallback, or N/A. -->

## Infrastructure Adapters

<!-- Concrete persistence, HTTP, messaging, cache, sandbox or runtime adapters. -->

## Error Handling

<!-- Domain/application errors, transport mapping, retries and failure recovery. -->

## Security

<!-- Threats and controls relevant to authentication, hidden data, untrusted code or sensitive data. -->

## Testing Strategy

<!-- Unit, integration, contract and end-to-end scenarios mapped to FR/AC IDs. -->

## Observability

<!-- Correlation IDs, safe logs, metrics and operational signals. -->

## Implementation Order

1. ...
2. ...

## Risks

<!-- Technical, data, compatibility and operational risks with mitigations. -->

## Architecture Compliance

<!--
Mandatory: explain how dependency direction, service/database ownership, adapters and module
boundaries comply with docs/architecture for this target service. Identify any approved exception.
-->

> `plan.md` describes HOW. It MUST NOT add behavior, actors or acceptance criteria beyond the
> Approved `spec.md`.
