# BKPractice Backend Agent Instructions

These instructions apply to the entire `bkpractice-backend` repository.

This file is only a map. Do not treat it as the workflow. Before any change, open the document
named for that step and follow what it says there.

## Where to read

| Step | Open this and follow it |
| --- | --- |
| 1. Spec | [`docs/agent/working-agreement.md`](docs/agent/working-agreement.md#step-1-spec), then the feature `spec.md` under [`specs/`](specs/README.md) |
| 2. Plan and tasks | [`docs/agent/working-agreement.md`](docs/agent/working-agreement.md#step-2-plan-and-tasks), the feature `plan.md` and `tasks.md`, and [`docs/pm/plan/README.md`](docs/pm/plan/README.md) |
| 3. Clarify open questions | [`docs/agent/working-agreement.md`](docs/agent/working-agreement.md#step-3-clarify-open-questions) |
| 4. Implement | [`docs/agent/working-agreement.md`](docs/agent/working-agreement.md#step-4-implement), then [How to write code](docs/agent/working-agreement.md#how-to-write-code) and [Documentation by module](docs/agent/working-agreement.md#documentation-by-module) |
| 5. Verify | [`docs/agent/working-agreement.md`](docs/agent/working-agreement.md#step-5-verify) and [`specs/00-system/definition-of-done.md`](specs/00-system/definition-of-done.md) |
| 6. Write the worked entry | [`docs/agent/working-agreement.md`](docs/agent/working-agreement.md#step-6-write-the-worked-entry) and [`docs/worked/README.md`](docs/worked/README.md) |

Also open these when the step depends on them:

| Question | Open |
| --- | --- |
| Which rule wins? | [Sources of truth](docs/agent/working-agreement.md#sources-of-truth) |
| What are the service boundaries? | [`docs/architecture/`](docs/architecture/system-architecture.md) and [`docs/adr/`](docs/adr/0001-service-specific-internal-architectures.md) |
| Which commands, secrets, and tools are allowed? | [Repository tooling and safety](docs/agent/working-agreement.md#repository-tooling-and-safety) |

Start at step 1 of the working agreement. Do not implement from this map alone.

<!-- CODEGRAPH_START -->

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for
it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the
  relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch
  hops grep can't follow. Name a file or symbol in the query to read its current line-numbered
  source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
