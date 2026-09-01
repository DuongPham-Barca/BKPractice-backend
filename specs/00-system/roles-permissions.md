# Roles and Permissions

## Platform roles

BKPractice has three platform roles:

- `STUDENT`
- `LECTURER`
- `ADMIN`

They are RBAC data and policy owned by Identity. They are not microservices, application folders or
database boundaries.

## Responsibility split

- Identity authenticates users, manages roles/permissions/account status and issues token claims.
- API Gateway verifies access tokens and may forward trusted identity/role metadata.
- Each business service enforces domain authorization, ownership and resource-level policy for the
  operation it owns.
- Clients cannot grant themselves roles or supply trusted internal identity headers.

## Requirements for feature specs

Every applicable `spec.md` must state:

- allowed actors and denied actors;
- ownership rules, such as editing only one's own resource;
- whether a permission is platform-wide, course/class-scoped or resource-scoped;
- trusted service-to-service actors where relevant;
- expected unauthorized and forbidden outcomes.

Every applicable plan maps these rules to the target service architecture and includes positive and
negative authorization tests. A missing authorization decision that changes access is an open
question and blocks spec approval.
