# API Gateway Architecture

## Selected style

The API Gateway uses **Layered Architecture**, as decided in
[ADR 0002](../adr/0002-revised-service-internal-architectures.md). It is the public backend entry
point, not a business service.

Layers here are transport layers, not business layers: middleware and guards, then proxy and
realtime adapters, then the upstream services. The Gateway has no domain layer and no repository
layer, and adding one would be an architecture violation rather than an improvement.

```text
HTTP / Socket.IO client
          |
          v
middleware and guards
          |
          v
proxy / realtime adapters
          |
          v
upstream business services
```

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

The current `auth`, `proxy` and `realtime` areas are transport-focused and the application has no
TypeORM dependency or business entity. This is **ALIGNED**. A deeper domain/application structure
must not be added.

If the Gateway grows, organize technical concerns under shallow `modules/`, `common/` and `config/`
folders. This is a naming cleanup, not a reason for a disruptive move today.

## Dependency rule

Controllers/gateways may depend on proxy and authentication services. Those services may depend on
NestJS transport/configuration clients and shared transport contracts. Nothing in the Gateway may
import a business service's entity, repository, datasource or migration.
