import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { OutboxWorker } from './outbox.worker';
import { OutboxDispatcher } from './outbox.dispatcher';
import { OutboxEventService } from './outbox-event.service';
import { UserEventsHandler } from './handlers/user-events.handler';
import { OutboxProcessorService } from './outbox-processor.service';
import { OutboxQueueModule } from './outbox-queue.module';

@Module({
  imports: [OutboxQueueModule, PrismaModule],
  providers: [
    OutboxWorker,
    OutboxDispatcher,
    OutboxEventService,
    UserEventsHandler,
    OutboxProcessorService,
  ],
  exports: [OutboxProcessorService],
})
export class OutboxProcessorModule {}
