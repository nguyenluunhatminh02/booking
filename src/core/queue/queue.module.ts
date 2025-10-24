import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailProcessor } from './processors/email.processor';
import { FilesProcessor } from './processors/files.processor';
import { CleanupProcessor } from './processors/cleanup.processor';
import { QueueService } from './queue.service';
import { EmailService } from '@/common/services';
import { FilesService } from '@/modules/files/files.service';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Bull Queue Module
 * Provides job queue infrastructure using BullMQ + Redis
 *
 * Available Queues:
 * - email: Send emails asynchronously
 * - files: Process file uploads (thumbnails, compression)
 * - cleanup: Cleanup tasks (orphan files, expired tokens)
 */
@Module({
  imports: [
    PrismaModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl =
          config.get<string>('REDIS_URL') || 'redis://localhost:6379';

        // Parse Redis URL
        const url = new URL(redisUrl);

        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || undefined,
            db: 0,
          },
          defaultJobOptions: {
            removeOnComplete: {
              age: 3600, // Keep completed jobs for 1 hour
              count: 1000, // Keep max 1000 completed jobs
            },
            removeOnFail: {
              age: 86400, // Keep failed jobs for 24 hours
              count: 5000, // Keep max 5000 failed jobs
            },
            attempts: 3, // Retry 3 times on failure
            backoff: {
              type: 'exponential',
              delay: 2000, // Start with 2s delay, then 4s, 8s
            },
          },
        };
      },
    }),
    // Register individual queues
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'files' },
      { name: 'cleanup' },
    ),
  ],
  providers: [
    QueueService,
    EmailProcessor,
    FilesProcessor,
    CleanupProcessor,
    EmailService,
    FilesService,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
