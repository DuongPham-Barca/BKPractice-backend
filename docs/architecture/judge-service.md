# Judge Service Architecture

## Selected style

Judge uses **Hexagonal Architecture (Ports & Adapters)** with an explicit **Pipeline** inside the
core, as decided in [ADR 0002](../adr/0002-revised-service-internal-architectures.md).

Judge is a stateless asynchronous execution engine, not a CRUD service and not a candidate for a
repository-oriented template. It is a transformation of one `JudgeRequest` into one `JudgeResult`.

Judge deliberately has **no domain model**: no aggregate, no entity with identity and lifecycle, no
repository and no business database. The non-obvious engineering in Judge is its sandbox isolation
model, not a model of a business concept. Introducing DDD building blocks here would be ceremony.

## The hexagon

```text
        DRIVING SIDE
   RabbitMQ consumer (adapter)
              |
              v
   ╔══════════════════════════════════════════╗
   ║  Judge core (stateless)                  ║
   ║                                          ║
   ║  validate -> prepare -> select runner    ║
   ║     -> compile -> execute -> evaluate    ║
   ║     -> classify                          ║
   ╚═══╤═══════════════╤══════════════════╤═══╝
       │ LanguageRunner│ Sandbox          │ ResultPublisher
       │ port          │ port             │ port
   ┌───▼───────────────▼──────────────────▼───┐
   │  C / C++ / Java   Docker adapter    RabbitMQ │
   │  / Python runners (later: gVisor…)  adapter  │
   └──────────────────────────────────────────┘
        DRIVEN SIDE
```

Judge is the clearest ports-and-adapters case in the repository: four interchangeable
`LanguageRunner` adapters exist today, and the sandbox boundary is designed so a second isolation
backend can replace Docker without touching the core.

## Core and adapters

The core owns orchestration, stage sequencing, output normalization, test evaluation and status
classification. It depends on transport contracts plus the `LanguageRunner`, `Sandbox` and result
publication ports. It must not construct arbitrary compiler or Docker commands from client input.

Language runners define trusted filenames and commands. Docker is one `Sandbox` implementation and
must enforce network, resource, privilege, timeout, output and workspace-cleanup controls. Judge
needs no persistent business database.

## Pipeline

The pipeline is the internal shape of the core, not a second architecture. Stages run in a fixed
order and may abort early — a failed compilation short-circuits the remaining stages and produces a
terminal result.

STANDARD, FUNCTION and OOP evaluation are pipeline strategies. They should share compilation and
sandbox primitives while owning their harness/evaluation differences. Do not create empty evaluators
before those flows exist.

## Current implementation and status

The current flow is `JudgeConsumer -> JudgeEngine -> RunnerRegistry -> LanguageRunner`, with
separate C, C++, Java and Python adapters and a Docker sandbox executor. The worker is stateless and
publishes a shared JudgeResult contract. This is the strongest existing internal separation.

Status: **PARTIALLY ALIGNED**. `LanguageRunner` is already a proper driven port, but `JudgeEngine`
depends directly on the concrete `DockerSandboxExecutor` and on Nest `ConfigService`, so the sandbox
boundary is not yet a port. Compilation, execution and evaluation are methods inside one
orchestrator rather than explicit pipeline stages, and the consumer publishes results directly
through the shared RabbitMQ service instead of through a result-publisher port.

## Incremental alignment

- Introduce the `Sandbox` port before adding another isolation backend or testing the engine without
  Docker; bind the Docker adapter at the Nest composition root.
- Introduce a result-publisher port when worker delivery behavior grows.
- Extract pipeline stage/evaluator objects only as FUNCTION/OOP behavior becomes real.
- Preserve the existing runner whitelist and keep Judge free of a business database.
- Do not add an aggregate, repository or persistence layer to Judge. If a future requirement needs
  durable state, it requires its own approved specification.
