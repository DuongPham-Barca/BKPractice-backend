# BKPractice System Architecture

## Purpose

BKPractice is a microservices-based programming practice platform. The backend is one NestJS
monorepo containing independently runnable applications. Monorepo ownership does not make the
applications one deployment unit and does not permit them to share business persistence models.

```text
                         Web / Mobile
                              |
                         REST / Socket.IO
                              |
                              v
                         API Gateway
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
    Identity              Learning             Community
                              ^
                              | submission.accepted
                              |
                         Submission
                              |
                         judge.request
                              |
                          RabbitMQ
                              |
                              v
                            Judge
                              |
                              v
                       Docker Sandbox
                    C / C++ / Java / Python
```

The diagram describes logical responsibility. Clients reach business APIs through the Gateway.
Submission also calls Learning's protected internal REST endpoint to obtain a judge package; it
never reads Learning's database.

## Application boundaries

| Application | Kind                | Owns                                                                                                                |
| ----------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| API Gateway | Edge infrastructure | Authentication verification, routing, rate limiting, request identity, realtime client connection                   |
| Identity    | Business service    | Authentication, users, profiles, refresh tokens, roles, permissions, account status                                 |
| Learning    | Business service    | Problems, test cases, topics, tags, courses, chapters, classes, enrollments, assignments, progress, recommendations |
| Submission  | Business service    | Run/Submit coordination, lifecycle, history, persisted results, judge messaging, realtime result publication        |
| Judge       | Compute worker      | Compilation, sandbox execution, evaluation, diagnostics and result generation                                       |
| Community   | Business service    | Posts, comments, replies, reactions, bookmarks, reports and moderation                                              |

`STUDENT`, `LECTURER`, and `ADMIN` are authorization roles owned by Identity. They are not
applications or deployment boundaries.

## Communication

- Web/Mobile to Gateway: REST and Socket.IO.
- Gateway to business services: REST forwarding with verified identity metadata.
- Submission to Learning: protected internal REST for hidden judge data.
- Submission to Judge: RabbitMQ `judge.request`.
- Judge to Submission: RabbitMQ `judge.result`.
- Submission to Learning: RabbitMQ `submission.accepted`.
- Submission to Gateway realtime: Redis Pub/Sub; Redis data is ephemeral.

RabbitMQ is used only where asynchronous processing or failure decoupling is useful. REST remains
the default synchronous service-to-service protocol.

## Data ownership

| Service    | Database                        |
| ---------- | ------------------------------- |
| Identity   | `bkpractice_identity`           |
| Learning   | `bkpractice_learning`           |
| Submission | `bkpractice_submission`         |
| Community  | `bkpractice_community`          |
| Judge      | No persistent business database |

Each owner keeps its entities, repositories, datasource and migrations inside its application.
External identifiers such as `userId`, `problemId` and `courseId` are values, not cross-database
TypeORM relations. `synchronize: true` is not an accepted schema strategy.

## System invariants

- The Gateway contains no domain business logic and accesses no business database.
- Submission never compiles or executes untrusted code.
- Judge remains separate from Submission and runs untrusted code only in a restricted sandbox.
- Hidden test cases and harnesses do not cross the public client boundary.
- Problem, Course, Assignment and Progress remain in Learning.
- Shared libraries contain technical code or transport contracts, never service-owned entities.
- Every application can build, run and deploy independently even though dependencies are installed
  from one pnpm workspace root.

See [service-architectures.md](./service-architectures.md) for the architecture selected inside each
application and [dependency-rules.md](./dependency-rules.md) for enforceable dependency direction.
