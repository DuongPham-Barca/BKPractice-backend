# Judge Security Constraints

Judge executes untrusted student code. These constraints are system architecture requirements and
override implementation convenience.

## Trust boundaries

- Submission coordinates Run/Submit but never compiles or executes code.
- Judge selects whitelisted language adapters and trusted commands.
- Student source and stdin are data, never shell fragments.
- Hidden test cases and runners remain server-side and never appear in public API responses.
- Judge is initially stateless and owns no submission-history database.

## Sandbox requirements

Every execution plan MUST preserve:

- disabled network;
- CPU, memory and execution-time limits;
- process/PID and output limits;
- minimal privileges, dropped capabilities and `no-new-privileges`;
- controlled filenames and command arguments;
- unique temporary workspace and reliable cleanup;
- stdout, stderr and compiler diagnostics capture;
- no privileged student-code container.

## SDD requirements

Judge specs define observable execution/classification requirements, not client-controlled runtime
commands. Judge plans use Worker + Pipeline + Adapter architecture and include abuse, timeout,
resource exhaustion, malformed payload, duplicate delivery, worker crash and cleanup tests where
applicable. Any relaxation of a sandbox control requires explicit security and architecture
approval; it cannot be hidden in a feature task.
