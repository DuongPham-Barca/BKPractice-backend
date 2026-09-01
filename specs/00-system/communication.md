# Communication Strategy

## Approved communication styles

- Client to API Gateway: REST and Socket.IO.
- Gateway to business services: REST forwarding.
- Synchronous service-to-service calls: REST by default.
- Asynchronous jobs/domain notifications: RabbitMQ when decoupling or retry is required.
- Ephemeral realtime fan-out/cache: Redis and Socket.IO.

Current principal flows are:

```text
Submission -> Learning internal REST: protected judge package
Submission -> RabbitMQ -> Judge: judge.request
Judge -> RabbitMQ -> Submission: judge.result
Submission -> RabbitMQ -> Learning: submission.accepted
Submission -> Redis -> Gateway -> client: realtime result
```

## Contract rules

- Public clients never supply hidden tests, expected outputs, harnesses, compiler commands or Docker
  configuration.
- Cross-service payloads use versionable transport contracts in technical contract libraries.
- Message plans define exchange, queue, routing key, producer, consumer, idempotency, ACK/NACK,
  retry and DLQ behavior.
- REST plans define ownership, authentication, timeout, failure mapping and compatibility.
- An event is introduced only for a real asynchronous use case, not architectural decoration.
- Transport delivery does not permit one service to query another service's database.

Feature plans mark irrelevant communication sections N/A with a reason.
