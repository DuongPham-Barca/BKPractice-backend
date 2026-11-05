# API Gateway Architecture

## Selected style

The API Gateway uses **Layered Architecture**, as decided in
[ADR 0002](../adr/0002-revised-service-internal-architectures.md). It is the public backend entry
point, not a business service.

Layers here are technical transport layers, not business layers:

```text
HTTP / Socket.IO client
          |
          v
presentation/  (controllers, middleware, guards, realtime gateway)
          |
          v
application/   (proxy forwarding, session check, result dispatch)
          |
          v
infrastructure/ (Identity HTTP client, Redis subscriber)
          |
          v
upstream business services
```

The Gateway has no domain layer and no repository layer. It owns no business rule, entity or
database; adding either layer would be an architecture violation rather than an improvement.
Dependencies point in exactly one direction: `presentation -> application -> infrastructure`.

## Responsibilities

- Route public REST requests to the owning service.
- Verify access tokens and remove caller-supplied identity headers.
- Forward trusted user/role metadata where appropriate.
- Apply rate limits and correlation/request IDs.
- Emit request logs keyed by correlation ID without logging tokens or sensitive bodies.
- Normalize upstream failures and preserve relevant response metadata.
- Own client-facing Socket.IO connections and forward ephemeral submission results.
- Expose Gateway health and Swagger configuration.

The Gateway must not contain business decisions, TypeORM entities, repositories, migrations or
connections to a business database. Authorization policy that requires domain state belongs to the
owning service; the Gateway may enforce coarse route metadata only.

## Current organization and status

```text
apps/api-gateway/src/
├── api-gateway.module.ts     composition root
├── main.ts
├── presentation/
│   ├── controllers/          REST entry points
│   ├── middleware/           authentication middleware
│   ├── guards/               rate-limit configuration
│   └── realtime/             Socket.IO gateway
├── application/
│   ├── auth/                 session verification use case
│   ├── proxy/                upstream forwarding
│   └── realtime/             result parsing and dispatch
└── infrastructure/
    ├── identity/             Identity session HTTP client
    └── redis/                submission-result subscriber
```

The application has no TypeORM dependency or business entity. This is **ALIGNED**.

## Dependency rule

Controllers, middleware, guards and realtime gateways may depend on application services.
Application services may depend on infrastructure adapters. Infrastructure adapters may depend on
NestJS transport/configuration clients and shared transport contracts. Nothing may import upward,
and nothing in the Gateway may import a business service's entity, repository, datasource or
migration.
