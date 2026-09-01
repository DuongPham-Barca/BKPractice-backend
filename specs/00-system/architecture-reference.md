# Architecture Reference for SDD

## Authoritative source

The authoritative decisions remain in:

- [`system-architecture.md`](../../docs/architecture/system-architecture.md)
- [`service-architectures.md`](../../docs/architecture/service-architectures.md)
- [`dependency-rules.md`](../../docs/architecture/dependency-rules.md)
- the relevant service-specific document under [`docs/architecture`](../../docs/architecture/)
- accepted ADRs under [`docs/adr`](../../docs/adr/)

This file is a planning index and short compliance summary. If wording differs, the architecture
documents and accepted ADRs take precedence.

## Required architecture by target

| Target      | Required architecture                                         | Required reading before plan.md                                                  |
| ----------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| API Gateway | Gateway Pattern + lightweight Layered Architecture            | `api-gateway.md`, `dependency-rules.md`                                          |
| Identity    | Clean Architecture + domain-oriented feature modules          | `identity-service.md`, `dependency-rules.md`                                     |
| Learning    | Clean Architecture + Modular Domain Architecture              | `learning-service.md`, `dependency-rules.md`                                     |
| Submission  | Clean Architecture + Event-Driven Architecture                | `submission-service.md`, `dependency-rules.md`                                   |
| Judge       | Worker Architecture + Pipeline Architecture + Adapter Pattern | `judge-service.md`, `dependency-rules.md`, `judge-security.md` in this directory |
| Community   | Clean Architecture + Modular Domain Architecture              | `community-service.md`, `dependency-rules.md`                                    |

Every `plan.md` must copy the applicable architecture into its **Required Service Architecture**
section and explain compliance in its final **Architecture Compliance** section.

## Planning constraints

- Use feature-first Clean Architecture layering only when real behavior justifies it.
- Do not create empty ports, use cases or folders for diagram symmetry.
- Keep business models inside their owning service; monorepo libraries are technical only.
- Keep Gateway free of domain/repository/database layers.
- Keep Judge worker/pipeline-oriented and initially stateless.
- Preserve database ownership and communication boundaries.
- Treat current `PARTIALLY ALIGNED` areas incrementally; a feature plan must not propose a broad
  folder rewrite unless separately approved as architecture work.

Architecture selection is not optional and cannot be changed inside a feature plan.
