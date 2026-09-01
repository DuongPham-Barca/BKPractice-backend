# Judge Service Architecture

## Selected style

Judge uses **Worker Architecture**, **Pipeline Architecture** and the **Adapter Pattern**. It is a
mostly stateless asynchronous execution engine, not a CRUD service and not a candidate for a
conventional repository-oriented Clean Architecture template.

```text
RabbitMQ consumer
       |
       v
Judge orchestrator
       |
       v
validate -> prepare -> select runner -> compile -> execute -> evaluate -> classify
       |                         |
       v                         v
 language runner port       sandbox port
       ^                         ^
 C / C++ / Java / Python     Docker adapter
       |
       v
Judge result publisher port -> RabbitMQ adapter
```

## Core and adapters

The core owns orchestration, stage sequencing, output normalization, test evaluation and status
classification. It depends on contracts plus practical ports such as `LanguageRunner`, `Sandbox`
and result publication. It must not construct arbitrary compiler or Docker commands from client
input.

Language runners define trusted filenames and commands. Docker is one Sandbox implementation and
must enforce network, resource, privilege, timeout, output and workspace-cleanup controls. Judge
does not need a persistent business database initially.

STANDARD, FUNCTION and OOP evaluation are pipeline strategies. They should share compilation and
sandbox primitives while owning their harness/evaluation differences. Do not create empty
evaluators before those flows exist.

## Current implementation and status

The current flow is `JudgeConsumer -> JudgeEngine -> RunnerRegistry -> LanguageRunner`, with
separate C, C++, Java and Python adapters and a Docker sandbox executor. The worker is stateless and
publishes a shared JudgeResult contract. This is the strongest existing internal separation.

Status: **PARTIALLY ALIGNED**. `LanguageRunner` is already a port, but `JudgeEngine` depends directly
on the concrete `DockerSandboxExecutor` and Nest `ConfigService`; compilation, execution and
evaluation are methods inside one orchestrator rather than explicit pipeline stages. The consumer
also publishes results directly through the shared RabbitMQ service.

## Incremental alignment

- Introduce a Sandbox port before adding another isolation backend or testing the engine without
  Docker; bind Docker at the Nest composition root.
- Introduce a result-publisher port when worker delivery behavior grows.
- Extract pipeline stage/evaluator objects only as FUNCTION/OOP behavior becomes real.
- Preserve the existing runner whitelist and keep Judge free of a business database.
