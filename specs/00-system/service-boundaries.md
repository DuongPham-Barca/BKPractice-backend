# Service Boundaries

Feature placement and ownership follow the authoritative
[system architecture](../../docs/architecture/system-architecture.md).

## API Gateway

Owns edge routing, access-token verification, coarse authorization metadata, rate limiting,
correlation IDs, safe request logging, error normalization and client realtime connections. It owns
no business entity or business database.

## Identity

Owns users, profiles, authentication, password credentials, refresh tokens, roles, permissions,
RBAC and account status. `STUDENT`, `LECTURER` and `ADMIN` remain roles, not services.

## Learning

Owns problems, test cases, topics, tags, starter code, supported problem languages, courses,
chapters, classes, enrollments, assignments, progress and rule-based recommendation. These remain
one Learning bounded context; do not introduce a separate Problem or Recommendation service.

## Submission

Owns Run coordination, official Submit lifecycle, submission history, result persistence and
realtime-result publication/delivery workflow. It may request a protected judge package from
Learning and send work to Judge, but it never executes untrusted code.

## Judge

Owns compilation, execution, Docker sandbox integration, language runners, STANDARD/FUNCTION/OOP
execution strategies, diagnostics and result classification. It does not own official submission
history or progress.

## Community

Owns posts, comments, replies, reactions, bookmarks, reports and moderation. `authorId`, `problemId`
and `courseId` are external identifiers, not cross-service persistence relations.

## Boundary rules for specs and plans

- Place the feature spec under the service that owns its state and policy.
- A workflow spanning services identifies one coordinating owner and explicit REST/event
  dependencies; it does not share repositories.
- A plan cannot move an existing responsibility to another service without a separately approved
  architecture decision.
- Shared message contracts do not transfer business ownership.
- If ownership is genuinely ambiguous, resolve it during Proposed-spec review before approval.
