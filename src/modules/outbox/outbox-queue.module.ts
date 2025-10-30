import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

/**
 * Shared module that registers the BullMQ queue for outbox processing.
 *
 * Both the HTTP-facing outbox module and the background worker module
 * import this module so the queue providers are declared only once.
 */
@Module({
  imports: [BullModule.registerQueue({ name: 'outbox' })],
  exports: [BullModule],
})
export class OutboxQueueModule {}
