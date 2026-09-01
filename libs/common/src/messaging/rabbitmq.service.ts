import { randomUUID } from 'node:crypto';

import { RABBIT_EXCHANGES, RABBIT_QUEUES, RABBIT_ROUTING_KEYS } from '@app/contracts';
import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp from 'amqplib';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';

interface PublishOptions {
  messageId?: string;
  headers?: Record<string, unknown>;
}

interface QueueBinding {
  queue: string;
  exchange: string;
  routingKey: string;
  deadQueue: string;
  deadRoutingKey: string;
}

const bindings: QueueBinding[] = [
  {
    queue: RABBIT_QUEUES.judgeRequests,
    exchange: RABBIT_EXCHANGES.judge,
    routingKey: RABBIT_ROUTING_KEYS.judgeRequest,
    deadQueue: RABBIT_QUEUES.judgeRequestsDead,
    deadRoutingKey: RABBIT_ROUTING_KEYS.judgeRequestDead,
  },
  {
    queue: RABBIT_QUEUES.submissionResults,
    exchange: RABBIT_EXCHANGES.submission,
    routingKey: RABBIT_ROUTING_KEYS.judgeResult,
    deadQueue: RABBIT_QUEUES.submissionResultsDead,
    deadRoutingKey: RABBIT_ROUTING_KEYS.judgeResultDead,
  },
  {
    queue: RABBIT_QUEUES.learningAccepted,
    exchange: RABBIT_EXCHANGES.learning,
    routingKey: RABBIT_ROUTING_KEYS.submissionAccepted,
    deadQueue: RABBIT_QUEUES.learningAcceptedDead,
    deadRoutingKey: RABBIT_ROUTING_KEYS.submissionAcceptedDead,
  },
];

@Injectable()
export class RabbitMqService implements OnApplicationShutdown {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection?: amqp.ChannelModel;
  private channel?: ConfirmChannel;
  private readonly maxRetries = 3;

  constructor(private readonly config: ConfigService) {}

  async publish<T extends object>(
    exchange: string,
    routingKey: string,
    payload: T,
    options: PublishOptions = {},
  ): Promise<void> {
    const channel = await this.getChannel();
    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
      contentType: 'application/json',
      deliveryMode: 2,
      messageId: options.messageId ?? randomUUID(),
      timestamp: Date.now(),
      headers: options.headers,
    });
    await channel.waitForConfirms();
  }

  async consume<T>(queue: string, handler: (payload: T) => Promise<void>): Promise<void> {
    const channel = await this.getChannel();
    await channel.consume(queue, (message) => {
      if (message) {
        void this.handleMessage(message, handler);
      }
    });
    this.logger.log(`Consuming RabbitMQ queue ${queue}`);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async handleMessage<T>(
    message: ConsumeMessage,
    handler: (payload: T) => Promise<void>,
  ): Promise<void> {
    const channel = await this.getChannel();
    try {
      const payload = JSON.parse(message.content.toString('utf8')) as T;
      await handler(payload);
      channel.ack(message);
    } catch (error: unknown) {
      const retries = Number(message.properties.headers?.['x-retry-count'] ?? 0);
      this.logger.error(
        `RabbitMQ handler failed (attempt ${retries + 1}): ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      if (retries < this.maxRetries) {
        channel.publish(message.fields.exchange, message.fields.routingKey, message.content, {
          ...message.properties,
          headers: { ...message.properties.headers, 'x-retry-count': retries + 1 },
        });
        await channel.waitForConfirms();
        channel.ack(message);
      } else {
        channel.nack(message, false, false);
      }
    }
  }

  private async getChannel(): Promise<ConfirmChannel> {
    if (this.channel) return this.channel;

    const url = this.config.getOrThrow<string>('RABBITMQ_URL');
    this.connection = await amqp.connect(url);
    this.connection.on('error', (error: Error) => this.logger.error(error.message));
    this.channel = await this.connection.createConfirmChannel();
    await this.channel.prefetch(1);
    await this.assertTopology(this.channel);
    return this.channel;
  }

  private async assertTopology(channel: ConfirmChannel): Promise<void> {
    await Promise.all([
      channel.assertExchange(RABBIT_EXCHANGES.judge, 'direct', { durable: true }),
      channel.assertExchange(RABBIT_EXCHANGES.submission, 'direct', { durable: true }),
      channel.assertExchange(RABBIT_EXCHANGES.learning, 'direct', { durable: true }),
      channel.assertExchange(RABBIT_EXCHANGES.deadLetter, 'direct', { durable: true }),
    ]);

    for (const binding of bindings) {
      await channel.assertQueue(binding.queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': RABBIT_EXCHANGES.deadLetter,
          'x-dead-letter-routing-key': binding.deadRoutingKey,
        },
      });
      await channel.bindQueue(binding.queue, binding.exchange, binding.routingKey);
      await channel.assertQueue(binding.deadQueue, { durable: true });
      await channel.bindQueue(
        binding.deadQueue,
        RABBIT_EXCHANGES.deadLetter,
        binding.deadRoutingKey,
      );
    }
  }
}
