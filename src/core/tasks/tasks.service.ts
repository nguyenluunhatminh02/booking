import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueueService } from '../queue/queue.service';
import { OutboxDispatcher } from '@/modules/outbox/outbox.dispatcher';

/**
 * Scheduled Tasks Service
 * Handles recurring background jobs using cron
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly queueService: QueueService,
    private readonly outboxDispatcher: OutboxDispatcher,
    @InjectPinoLogger(TasksService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Cleanup orphan files daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'cleanup-orphan-files',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleOrphanFilesCleanup() {
    this.logger.info('Starting scheduled orphan files cleanup');

    try {
      await this.queueService.cleanupOrphanFiles();
      this.logger.info('Orphan files cleanup scheduled successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to schedule orphan files cleanup');
    }
  }

  /**
   * Cleanup expired tokens every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS, {
    name: 'cleanup-expired-tokens',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleExpiredTokensCleanup() {
    this.logger.info('Starting scheduled expired tokens cleanup');

    try {
      await this.queueService.cleanupExpiredTokens();
      this.logger.info('Expired tokens cleanup scheduled successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to schedule expired tokens cleanup');
    }
  }

  /**
   * Cleanup expired idempotency records daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'cleanup-idempotency',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleIdempotencyCleanup() {
    this.logger.info('Starting scheduled idempotency cleanup');

    try {
      await this.queueService.cleanupExpiredIdempotency();
      this.logger.info('Idempotency cleanup scheduled successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to schedule idempotency cleanup');
    }
  }

  /**
   * Cleanup old refresh tokens every 12 hours
   */
  @Cron(CronExpression.EVERY_12_HOURS, {
    name: 'cleanup-refresh-tokens',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleRefreshTokensCleanup() {
    this.logger.info('Starting scheduled refresh tokens cleanup');

    try {
      await this.queueService.cleanupOldRefreshTokens();
      this.logger.info('Refresh tokens cleanup scheduled successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to schedule refresh tokens cleanup');
    }
  }

  /**
   * Log queue stats every hour for monitoring
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'log-queue-stats',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleQueueStatsLogging() {
    try {
      const stats = await this.queueService.getQueueStats();
      this.logger.info({ stats }, 'Queue statistics');
    } catch (error) {
      this.logger.error({ error }, 'Failed to get queue stats');
    }
  }

  /**
   * Retry dead letter queue (failed outbox events) every hour
   * Attempts to re-dispatch events that previously failed
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'retry-dead-letter-queue',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleDeadLetterQueueRetry() {
    this.logger.info('Starting dead letter queue retry');

    try {
      const result = await this.outboxDispatcher.retryDeadLetters(3);
      this.logger.info(
        { retriedCount: result.retried },
        'Dead letter queue retry completed',
      );
    } catch (error) {
      this.logger.error({ error }, 'Failed to retry dead letter queue');
    }
  }
}
