import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OutboxDispatcher } from './outbox.dispatcher';
import { OutboxEventService } from './outbox-event.service';

const DEFAULT_POLL_INTERVAL_MS = 15_000;

@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private readonly pollBatchSize: number;
  private readonly cleanupOlderThanHours: number;

  constructor(
    private readonly outboxDispatcher: OutboxDispatcher,
    private readonly outboxEventService: OutboxEventService,
    private readonly configService: ConfigService,
  ) {
    this.pollBatchSize = Number(
      this.configService.get('OUTBOX_BATCH_SIZE') ?? 50,
    );
    this.cleanupOlderThanHours = Number(
      this.configService.get('OUTBOX_CLEANUP_SENT_HOURS') ?? 24,
    );
  }

  /**
   * Periodically look for pending outbox events and enqueue them to BullMQ.
   */
  @Interval(DEFAULT_POLL_INTERVAL_MS)
  async enqueuePendingEvents(): Promise<void> {
    try {
      const pending = await this.outboxEventService.getPendingEvents(
        this.pollBatchSize,
      );

      if (!pending.length) {
        this.logger.debug('No pending outbox events to enqueue');
        return;
      }

      this.logger.log(`Enqueuing ${pending.length} pending outbox event(s)`);

      for (const event of pending) {
        try {
          await this.outboxDispatcher.dispatch(event.id);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : JSON.stringify(error);
          this.logger.error(
            `Failed to enqueue outbox event ${event.id}: ${message}`,
          );
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`Failed to fetch pending outbox events: ${message}`);
    }
  }

  /**
   * Cleanup sent events on a schedule so the outbox table does not grow forever.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'outbox-cleanup-sent',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async cleanupSentEvents(): Promise<void> {
    try {
      const result = await this.outboxEventService.cleanupSentEvents(
        this.cleanupOlderThanHours,
      );

      const removed =
        typeof result === 'number' ? result : (result?.count ?? 0);
      this.logger.log(
        `Cleaned up ${removed} sent outbox event(s) older than ${this.cleanupOlderThanHours}h`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`Failed to cleanup sent outbox events: ${message}`);
    }
  }
}
