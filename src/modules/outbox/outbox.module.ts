import { Module } from '@nestjs/common';
import { OutboxDispatcher } from './outbox.dispatcher';
import { OutboxEventService } from './outbox-event.service';
import { OutboxController } from './outbox.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { OutboxQueueModule } from './outbox-queue.module';
import { OutboxEventHandlers } from './handlers/outbox-event.handlers';
import { BookingEventHandlers } from './handlers/booking.event-handlers';
import { UserEventHandlers } from './handlers/user.event-handlers';
import { OutboxProducer } from './outbox.producer';

@Module({
  imports: [OutboxQueueModule, PrismaModule],
  providers: [
    OutboxDispatcher,
    OutboxEventService,
    OutboxEventHandlers,
    BookingEventHandlers,
    UserEventHandlers,
    OutboxProducer,
  ],
  controllers: [OutboxController],
  exports: [
    OutboxDispatcher,
    OutboxEventService,
    OutboxEventHandlers,
    OutboxProducer,
  ],
})
export class OutboxModule {}
