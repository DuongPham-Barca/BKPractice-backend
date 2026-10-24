# BKPractice Backend Agent Instructions

These instructions apply to the entire `bkpractice-backend` repository.

This file is only a map. Do not treat it as the workflow. Before any change, open the document
named for that step and follow what it says there.

> Lưu ý: toàn bộ tài liệu spec/plan/architecture/adr/worked/pm đã được gộp vào thư mục `.docs/`
> (replaces `docs/` + `specs/` ở gốc). Tất cả đường dẫn dưới đây đã được điều chỉnh theo `.docs/`.

## Where to read

| Step                      | Open this and follow it                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Spec                   | [`.docs/agent/working-agreement.md`](.docs/agent/working-agreement.md#step-1-spec), then the feature `spec.md` under [`specs/`](.docs/specs/README.md)                                                                                                       |
| 2. Plan and tasks         | [`docs/agent/working-agreement.md`](.docs/agent/working-agreement.md#step-2-plan-and-tasks), the feature `plan.md` and `tasks.md`, and [`docs/pm/plan/README.md`](.docs/pm/plan/README.md)                                                                   |
| 3. Clarify open questions | [`docs/agent/working-agreement.md`](.docs/agent/working-agreement.md#step-3-clarify-open-questions)                                                                                                                                                          |
| 4. Implement              | [`docs/agent/working-agreement.md`](.docs/agent/working-agreement.md#step-4-implement), then [How to write code](.docs/agent/working-agreement.md#how-to-write-code) and [Documentation by module](.docs/agent/working-agreement.md#documentation-by-module) |
| 5. Verify                 | [`docs/agent/working-agreement.md`](.docs/agent/working-agreement.md#step-5-verify) and [`specs/00-system/definition-of-done.md`](.docs/specs/00-system/definition-of-done.md)                                                                               |
| 6. Write the worked entry | [`docs/agent/working-agreement.md`](.docs/agent/working-agreement.md#step-6-write-the-worked-entry) and [`docs/worked/README.md`](.docs/worked/README.md)                                                                                                    |

Also open these when the step depends on them:

| Question                                        | Open                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Which rule wins?                                | [Sources of truth](.docs/agent/working-agreement.md#sources-of-truth)                                                                            |
| What are the service boundaries?                | [`.docs/architecture/`](.docs/architecture/system-architecture.md) and [`.docs/adr/`](.docs/adr/0001-service-specific-internal-architectures.md) |
| Which commands, secrets, and tools are allowed? | [Repository tooling and safety](.docs/agent/working-agreement.md#repository-tooling-and-safety)                                                  |

Start at step 1 of the working agreement. Do not implement from this map alone.

<!-- CODEGRAPH_START -->

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repository root), use
CodeGraph before grep/find or broad file reading when locating symbols or understanding code
relationships.

Choose the smallest suitable command:

1. Use `codegraph node <file-or-symbol>` when the file or symbol is already known.
2. Use `codegraph query "<keyword>"` for narrow symbol discovery.
3. Use `codegraph explore "<specific symbols or question>"` for multi-symbol behavior, dependencies,
   call paths, or dynamic dispatch.
4. Use `rg` directly for exact text, configuration, documentation, environment templates, generated
   files, or when CodeGraph returns no relevant result. Environment-file safety rules still apply.

When using `codegraph explore`, keep the query narrow and name relevant services, files, or symbols
whenever possible.

- **MCP tool** (when available): `codegraph_explore` returns relevant symbols' current source and
  call paths, including dynamic-dispatch relationships that text search may miss.
- **Shell fallback**: `codegraph explore "<specific symbols or question>"`.

After creating, deleting, moving, or changing source code, run:

```bash
codegraph sync .
```

Use `codegraph index .` only when a complete rebuild is required, such as after a corrupted or
materially stale index. Use `codegraph status .` to verify index health.

Treat `.codegraph/` as generated local data. Do not manually edit or commit its database, daemon
files, sockets, or logs. Only `.codegraph/.gitignore` may be committed.

If there is no `.codegraph/` directory, skip CodeGraph entirely. Index initialization is the user's
decision.
<!-- CODEGRAPH_END -->
