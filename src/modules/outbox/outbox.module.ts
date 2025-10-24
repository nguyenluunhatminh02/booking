import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OutboxDispatcher } from './outbox.dispatcher';
import { OutboxWorker } from './outbox.worker';
import { OutboxEventService } from './outbox-event.service';
import { OutboxController } from './outbox.controller';
import { UserEventsHandler } from './handlers/user-events.handler';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'outbox' }), PrismaModule],
  providers: [
    OutboxDispatcher,
    OutboxWorker,
    OutboxEventService,
    UserEventsHandler,
  ],
  controllers: [OutboxController],
  exports: [OutboxDispatcher, OutboxEventService],
})
export class OutboxModule {}
