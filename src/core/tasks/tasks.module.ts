import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [ScheduleModule.forRoot(), QueueModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
