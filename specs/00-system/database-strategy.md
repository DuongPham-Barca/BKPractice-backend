# Database Strategy

## Ownership

| Service    | Owned database                            |
| ---------- | ----------------------------------------- |
| Identity   | `bkpractice_identity`                     |
| Learning   | `bkpractice_learning`                     |
| Submission | `bkpractice_submission`                   |
| Community  | `bkpractice_community`                    |
| Judge      | No persistent business database initially |

Development may use one PostgreSQL server/container, but database ownership remains independent.

## Mandatory rules

- No cross-service SQL or direct database access.
- No cross-service foreign key or TypeORM relationship.
- No service-owned business TypeORM entity in `libs/`.
- External relationships are stored as IDs and resolved through REST/events only when needed.
- Schema changes use a migration in the owning service.
- `synchronize: true` is not an accepted schema strategy.
- Redis is not a persistent business database.
- Judge receives no database merely for symmetry; persistence requires a separately justified and
  approved requirement.

## SDD requirements

A spec describes required persistent behavior without prescribing tables unless schema shape is a
business/compatibility constraint. Its plan identifies the owning database, entity/repository
impact, indexes/constraints, TypeORM migration, compatibility and revert strategy. Tasks include
migration verification only when database changes apply.
