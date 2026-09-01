# ADR 0001: Service-specific Internal Architectures

- Status: Accepted
- Date: 2026-09-01

## Context

BKPractice applications share a NestJS monorepo and engineering conventions, but their workloads
are materially different. Identity, Learning, Submission and Community coordinate business rules
and persistent state. Judge is an asynchronous untrusted-code execution worker. API Gateway is an
edge routing and authentication component.

Forcing one folder/layer template on every application would either couple domain services to
infrastructure or add empty enterprise abstractions to Gateway and Judge.

## Decision

BKPractice microservices may use different internal architectures according to workload:

- API Gateway: Gateway Pattern + lightweight Layered Architecture.
- Identity: Clean Architecture + domain-oriented feature modules.
- Learning: Clean Architecture + Modular Domain Architecture.
- Submission: Clean Architecture + Event-Driven Architecture.
- Judge: Worker Architecture + Pipeline Architecture + Adapter Pattern.
- Community: Clean Architecture + Modular Domain Architecture.

All applications still share dependency-direction, database-ownership, transport-contract and
operational conventions. Clean Architecture services use feature-first grouping and add internal
layers only when real code justifies them.

## Consequences

- Each service structure communicates its workload instead of diagram uniformity.
- Teams need to understand a small set of documented patterns rather than one universal template.
- Shared libraries remain technical; business models stay with their owning service.
- Existing shallow foundation modules are migrated incrementally when features evolve.
- Architecture reviews assess dependency direction and responsibility, not folder-name symmetry.
- Judge and Gateway avoid unnecessary repository/domain abstractions.

## Rejected alternatives

- One identical Clean Architecture template for all applications: rejected because it adds
  meaningless layers to Gateway and Judge.
- Unstructured NestJS services with direct dependencies everywhere: rejected because business
  services need testable policy and infrastructure seams as they grow.
- Separate services for roles, problems or recommendations: rejected because these are roles or
  subdomains inside existing bounded contexts, not independent deployment requirements.
