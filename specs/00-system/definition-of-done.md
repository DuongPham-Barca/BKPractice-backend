# Definition of Done

A feature is Done only when every applicable condition below is satisfied. An irrelevant item may
be marked N/A with a concrete reason; N/A is not a substitute for unfinished work.

## Specification and planning

- [ ] `spec.md` exists and has Status `Approved` before implementation starts.
- [ ] `plan.md` exists and does not expand the Approved spec.
- [ ] `tasks.md` exists and reflects the plan.
- [ ] The required service architecture is selected from `docs/architecture/`.
- [ ] Open questions that affect behavior are resolved.

## Implementation

- [ ] All functional requirements are implemented.
- [ ] All acceptance criteria are satisfied.
- [ ] Authorization and ownership rules are implemented where applicable.
- [ ] Input validation and error behavior are implemented where applicable.
- [ ] Required TypeORM migrations are created and verified.
- [ ] Swagger is updated when API contracts change.
- [ ] Messaging/realtime contracts and delivery behavior are implemented where applicable.
- [ ] No unapproved Out-of-Scope functionality was added.

## Quality and verification

- [ ] Required tests were added and relevant tests pass.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] `tasks.md` reflects completed work and justified N/A items.
- [ ] Implementation was verified against every requirement and acceptance criterion in `spec.md`.
- [ ] Implementation was verified against the target service architecture and dependency rules.
- [ ] Security was reviewed where applicable, especially authentication, authorization, hidden data
      and untrusted-code execution.
- [ ] Deviations, unverified behavior and remaining risks are reported.

After implementation verification, the authorized workflow may move the spec through `Implemented`
to `Verified`. An implementation agent does not silently rewrite an Approved spec to make the
result appear compliant.
