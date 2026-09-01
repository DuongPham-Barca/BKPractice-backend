# Learning Service Architecture

## Selected style

Learning uses **Clean Architecture** with a **Modular Domain Architecture**. Problem/TestCase,
Course, Assignment, Enrollment, Progress and Recommendation stay inside this one bounded context.
They must not be split into a Problem Service or Recommendation Service during the foundation phase.

Preferred feature-first growth:

```text
modules/
├── problems/
├── courses/
├── assignments/
├── enrollments/
├── progress/
└── recommendation/
```

A large module may add `domain`, `application`, `infrastructure` and `presentation`; a small module
remains shallow. Test cases, topics, tags, starter code and supported languages belong to Problems.
Chapters and classes belong with Courses until their behavior justifies a clearer internal module.

## Dependency direction

REST controllers and message consumers are presentation/inbound adapters. They call application
use cases. Use cases coordinate domain policy and ports. TypeORM repositories, internal REST
responses and RabbitMQ consumers belong to infrastructure/presentation edges rather than domain.

Relations between Learning-owned tables are valid. References to Identity or Submission are plain
external IDs and never cross-database TypeORM relations.

## Current implementation and status

The service correctly owns all 13 current Learning entities, migrations and
`bkpractice_learning`. Problems, Courses, Assignments and Progress remain in the same service; the
accepted-submission event updates Progress without querying Submission's database. Hidden judge
data is exposed only through a protected internal endpoint.

Status: **PARTIALLY ALIGNED**. Domain grouping exists, but `ProblemsController` directly queries
TypeORM and constructs the judge package, while `ProgressConsumer` directly applies persistence
updates. TypeORM entities currently combine persistence and domain representation.

## Incremental alignment

- Extract `ListPublishedProblems`, `BuildJudgePackage` and `ApplyAcceptedSubmission` use cases when
  those flows next change.
- Put repository/message implementations behind focused ports at that point.
- Add modules for Enrollment/Recommendation only with real behavior; do not create empty folders.
- Keep internal cross-module interaction explicit and avoid a generic shared Learning service.
