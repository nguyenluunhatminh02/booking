import { Module } from '@nestjs/common';
import { QueueAdminController } from './queue-admin.controller';
import { QueueModule } from '@/core/queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [QueueAdminController],
})
export class AdminModule {}
