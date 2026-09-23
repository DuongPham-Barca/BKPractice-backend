# ADR 0002: Revised Service Internal Architectures

- Status: Accepted
- Date: 2026-09-23
- Supersedes: [ADR 0001: Service-specific Internal Architectures](./0001-service-specific-internal-architectures.md)

## Context

ADR 0001 established that each application may use a different internal architecture according to
its workload. That principle holds and is not revisited here. What this ADR revises is the **naming
and emphasis** of four of the six selections, because the ADR 0001 labels caused two practical
problems.

**The Judge label did not communicate its own design.** The ADR 0001 label for Judge — Worker
Architecture, Pipeline Architecture and the Adapter Pattern — describes, in effect, a
ports-and-adapters core: `LanguageRunner` is already a port with four interchangeable adapters
(C, C++, Java, Python), Docker is one implementation of a sandbox boundary, and result publication
crosses another adapter. "Worker Architecture" is not a widely agreed term and obscures that this is
textbook Hexagonal Architecture with an explicit pipeline inside the core.

**The Learning label understated where its difficulty lies.** Learning is the only application in
the system whose hard part is the model itself: LRN-001 Problem Management alone carries a lifecycle
with several states and explicit transitions, publish-readiness invariants that span type, enabled
languages, per-language contracts, starter code and execution limits, and a vocabulary
(Draft, Publish, Hold, Readiness, Visible Example, Hidden Harness) that behaves as a real ubiquitous
language. "Clean Architecture + Modular Domain Architecture" names the folder arrangement but says
nothing about modelling, which is the part most likely to be done badly.

Two further labels carried qualifiers that added length without adding constraint. The Gateway label
(Gateway Pattern plus a lightweight Layered Architecture) and the Community label (Clean
Architecture plus Modular Domain Architecture) are adequately expressed as "Layered Architecture"
and "Clean Architecture"; the organizational guidance they implied is retained in the service
documents rather than in the label.

## Decision

The selected internal architecture per application is now:

- API Gateway: **Layered Architecture**.
- Identity: **Clean Architecture**.
- Learning: **DDD + Hexagonal Architecture**.
- Submission: **Clean Architecture + Event-Driven Architecture**.
- Judge: **Hexagonal Architecture (Ports & Adapters) + Pipeline**.
- Community: **Clean Architecture**.

### What actually changes

| Application | ADR 0001                                                      | ADR 0002                                       | Nature of change     |
| ----------- | ------------------------------------------------------------- | ---------------------------------------------- | -------------------- |
| API Gateway | Gateway Pattern + lightweight Layered Architecture            | Layered Architecture                           | Label simplified     |
| Identity    | Clean Architecture + domain-oriented feature modules          | Clean Architecture                             | Label simplified     |
| Learning    | Clean Architecture + Modular Domain Architecture              | DDD + Hexagonal Architecture                   | Emphasis changed     |
| Submission  | Clean Architecture + Event-Driven Architecture                | Clean Architecture + Event-Driven Architecture | Unchanged            |
| Judge       | Worker Architecture + Pipeline Architecture + Adapter Pattern | Hexagonal Architecture + Pipeline              | Renamed, same design |
| Community   | Clean Architecture + Modular Domain Architecture              | Clean Architecture                             | Label simplified     |

Only Learning changes in substance. Judge is renamed to the standard term for the design it already
follows. The other four are unchanged in behavior; three lose a qualifier that is now expressed in
their service document instead.

### Learning: DDD + Hexagonal

DDD supplies the tactical modelling vocabulary — aggregate root, value object, domain service,
repository — applied inside the single Learning bounded context. Hexagonal supplies the structural
rule: the domain and the use cases around it sit inside the hexagon; everything else (TypeORM, the
Gateway-supplied principal, transactions, Topic/Tag lookups) is reached through a driven port and
implemented by an adapter, while REST controllers and RabbitMQ consumers are driving adapters.

DDD is used **tactically only**. Context mapping, anti-corruption layers and multiple bounded
contexts are out of scope: Learning is one bounded context and stays one. Aggregates are introduced
where invariants justify them, not per table.

### Judge: Hexagonal + Pipeline

The Judge core is a stateless transformation of a `JudgeRequest` into a `JudgeResult`. It owns
stage sequencing, output normalization, test evaluation and status classification, and reaches the
outside world only through ports: language runners, sandbox execution and result publication. The
pipeline (validate → prepare → select runner → compile → execute → evaluate → classify) is the
internal shape of the core.

Judge deliberately has **no domain model** in the DDD sense: no aggregate, no entity with identity
and lifecycle, no repository, no business database. Introducing any of these would be ceremony.

## Consequences

- Each label now names either a structural pattern or, for Learning, a structural pattern plus the
  modelling approach. No label is only a methodology and no label is only a communication style.
- Judge documentation, and any future `JDG-*` specification, uses the standard ports-and-adapters
  vocabulary instead of the bespoke "Worker Architecture" term. No code change is implied.
- Learning feature work is expected to define the domain model first and to keep it free of
  framework imports. The `LRN-001` plan already describes an aggregate, value objects, a lifecycle
  state machine, a publish validator and six driven ports, so it satisfies this ADR as written.
- Approved `plan.md` documents must state the architecture from this ADR in their **Required
  Service Architecture** section. Updating that section to match a revised architecture decision is
  architecture work, not a feature-scope change, and does not by itself reopen the approved
  requirements of the feature.
- Every rule from ADR 0001 that this ADR does not restate remains in force, including
  dependency direction, database ownership, transport contracts, "no empty layers", and incremental
  per-feature alignment instead of repository-wide rewrites.
- `PARTIALLY ALIGNED` service statuses are unaffected. Renaming a target architecture does not move
  an application closer to or further from it.

## Rejected alternatives

- **Keep ADR 0001 unchanged:** rejected because "Worker Architecture" is non-standard for a design
  that is plainly ports-and-adapters, and because the Learning label hides the modelling work.
- **DDD for Judge:** rejected. Judge is stateless and has no entity, aggregate, invariant or
  database to model. The valuable and non-obvious part of Judge is its sandbox isolation model, not
  a domain model.
- **Drop the structural pattern from Submission and label it Event-Driven only:** rejected.
  Submission owns real business rules — terminal-state guarding, stable accepted-event identity and
  the definition of an officially accepted submission — and a label without a structural pattern
  gives that logic no defined home. It currently lives inside a RabbitMQ consumer, which is exactly
  the outcome the structural half of the label exists to prevent.
- **One architecture for all six applications:** rejected for the reasons already recorded in
  ADR 0001.
