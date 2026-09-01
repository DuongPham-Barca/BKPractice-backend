# Community Service Architecture

## Selected style

Community uses **Clean Architecture** with a **Modular Domain Architecture**. Its feature areas are
Posts, Comments/Replies, Reactions, Bookmarks and Moderation/Reports.

```text
modules/
├── posts/
├── comments/
├── reactions/
├── bookmarks/
└── moderation/
```

Small related behavior may remain together in `posts` until it has enough policy or endpoints to
justify a module. A significant module may then add `domain`, `application`, `infrastructure` and
`presentation` folders. Folder count is not an architecture goal.

## Dependency direction

Controllers invoke application use cases. Use cases enforce ownership, reply depth, reaction
uniqueness and moderation policy through domain objects and ports. TypeORM repositories and
transport details are infrastructure. The domain must not depend on Learning or Identity clients.

`authorId`, `problemId` and `courseId` are external identifiers. Community may validate them through
service APIs when a use case requires it, but never creates cross-database foreign keys or queries
another service's database.

## Current implementation and status

Community owns five entity types and `bkpractice_community`. External references are UUID columns
without cross-service relations. Post, one-level reply and LIKE behavior are kept inside the
Community boundary.

Status: **PARTIALLY ALIGNED**. The current single Posts module is appropriate for its small size,
but `PostsService` mixes application/domain rules with direct TypeORM access, and persistence
entities act as domain models. Bookmarks and Reports have schema foundations but no business
features, so no empty service/module layers should be created for them yet.

## Incremental alignment

- Extract use cases and repository ports as ownership, moderation and reporting rules grow.
- Split Comments/Reactions/Moderation into modules only when their behavior becomes independently
  meaningful.
- Preserve plain external IDs and service-owned migrations.
