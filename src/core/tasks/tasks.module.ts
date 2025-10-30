import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { QueueModule } from '../queue/queue.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';

@Module({
  imports: [ScheduleModule.forRoot(), QueueModule, OutboxModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
