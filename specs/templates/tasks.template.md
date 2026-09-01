# [FEATURE-ID] Implementation Tasks

Related spec: `./spec.md`  
Related plan: `./plan.md`

Mark non-applicable items as `- [x] N/A — reason`. Keep this checklist synchronized with actual
implementation; checking an item means it is complete and verified where applicable.

## Preparation

- [ ] Inspect existing code and repository state.
- [ ] Confirm `spec.md` exists and Status is `Approved`.
- [ ] Confirm the target service architecture in `docs/architecture/`.
- [ ] Confirm `plan.md` matches the Approved spec and does not expand scope.
- [ ] Confirm open questions do not block implementation.

## Domain

- [ ] Implement applicable domain rules, invariants and state transitions.
- [ ] Add focused domain tests.

## Application

- [ ] Implement planned use cases/workflows.
- [ ] Implement only ports justified by the plan.

## Infrastructure

- [ ] Implement planned technical adapters.
- [ ] Wire adapters at the service composition root.

## Persistence

- [ ] Implement repository/query behavior in the owning service.
- [ ] Verify no cross-service database access or shared business entity was introduced.

## Database / Migration

- [ ] Add the planned TypeORM migration.
- [ ] Verify migration apply/revert behavior and `synchronize` remains disabled.

## API

- [ ] Implement planned routes/contracts only.
- [ ] Add DTO validation/transformation.
- [ ] Update Swagger when the public/internal API changes.

## Messaging

- [ ] Implement planned message contracts and adapters.
- [ ] Verify ACK/NACK, retry, idempotency and DLQ behavior where applicable.

## Realtime

- [ ] Implement planned realtime publication/delivery.
- [ ] Verify persistent state remains the source of truth.

## Authorization

- [ ] Implement role, permission, ownership and trusted-service checks from the spec.
- [ ] Test allowed and denied actors.

## Testing

- [ ] Map tests to functional requirements and acceptance criteria.
- [ ] Add applicable unit, integration, contract and end-to-end tests.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.

## Documentation

- [ ] Update relevant API, event, operational and architecture documentation.
- [ ] Record approved deviations and migration/rollout notes.

## Verification

- [ ] Verify implementation against every `FR-*` and `AC-*`.
- [ ] Confirm no Out-of-Scope behavior was added.
- [ ] Update spec status to `Implemented` only through the approved review workflow.
- [ ] Record validation results and unverified behavior.

## Architecture Compliance

- [ ] Verify dependency direction for the selected service architecture.
- [ ] Verify service and database ownership boundaries.
- [ ] Verify shared libraries contain no service-owned business model.
- [ ] Verify implementation matches the Architecture Compliance section of `plan.md`.
