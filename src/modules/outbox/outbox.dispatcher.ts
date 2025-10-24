import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OutboxDispatcher {
  private readonly logger = new Logger(OutboxDispatcher.name);

  constructor(
    @InjectQueue('outbox') private outboxQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Dispatch một outbox event vào queue
   */
  async dispatch(outboxId: string): Promise<void> {
    try {
      const event = await this.prisma.outboxEvent.findUnique({
        where: { id: outboxId },
      });

      if (!event) {
        this.logger.warn(`Outbox event ${outboxId} not found`);
        return;
      }

      if (event.status !== OutboxStatus.PENDING) {
        this.logger.warn(
          `Outbox event ${outboxId} already processed (status: ${event.status})`,
        );
        return;
      }

      // Lấy config từ environment
      const maxRetries = Number(this.config.get('OUTBOX_MAX_RETRIES') ?? 5);
      const retryBackoff = Number(
        this.config.get('OUTBOX_RETRY_BACKOFF_MS') ?? 1000,
      );

      await this.outboxQueue.add(
        'process',
        { outboxId },
        {
          attempts: maxRetries,
          backoff: {
            type: 'exponential',
            delay: retryBackoff,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      // Cập nhật status thành ENQUEUED
      await this.prisma.outboxEvent.update({
        where: { id: outboxId },
        data: {
          status: OutboxStatus.ENQUEUED,
          enqueuedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      this.logger.debug(`Enqueued outbox event ${outboxId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.outboxEvent.update({
        where: { id: outboxId },
        data: {
          status: OutboxStatus.FAILED,
          attempts: { increment: 1 },
          error: message.slice(0, 500),
        },
      });

      this.logger.error(`Failed to dispatch outbox event ${outboxId}: ${message}`);
      throw error;
    }
  }

  /**
   * Dispatch tất cả pending events
   * Gọi từ cron job hoặc manually
   */
  async dispatchAll(batchSize: number = 100): Promise<{ dispatched: number }> {
    this.logger.log('Starting outbox dispatch...');

    try {
      const pendingEvents = await this.prisma.outboxEvent.findMany({
        where: { status: OutboxStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
      });

      let dispatched = 0;

      for (const event of pendingEvents) {
        try {
          await this.dispatch(event.id);
          dispatched++;
        } catch (error) {
          this.logger.error(
            `Failed to dispatch event ${event.id}:`,
            error instanceof Error ? error.message : error,
          );
          // Continue với events khác
        }
      }

      this.logger.log(
        `Dispatch completed. Dispatched ${dispatched}/${pendingEvents.length} events`,
      );

      return { dispatched };
    } catch (error) {
      this.logger.error('Failed to dispatch all events:', error);
      throw error;
    }
  }

  /**
   * Retry dead letter queue (events bị failed)
   */
  async retryDeadLetters(maxRetries: number = 3): Promise<{ retried: number }> {
    this.logger.log('Starting dead letter retry...');

    try {
      const failedEvents = await this.prisma.outboxEvent.findMany({
        where: {
          status: OutboxStatus.FAILED,
          attempts: { lt: maxRetries },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      let retried = 0;

      for (const event of failedEvents) {
        try {
          // Cập nhật status về PENDING để retry
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: OutboxStatus.PENDING,
              error: null,
            },
          });

          await this.dispatch(event.id);
          retried++;
        } catch (error) {
          this.logger.error(
            `Failed to retry event ${event.id}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }

      this.logger.log(`Dead letter retry completed. Retried ${retried} events`);

      return { retried };
    } catch (error) {
      this.logger.error('Failed to retry dead letters:', error);
      throw error;
    }
  }

  /**
   * Health check cho outbox system
   */
  async healthCheck(): Promise<{
    pending: number;
    failed: number;
    enqueued: number;
    sent: number;
  }> {
    const [pending, failed, enqueued, sent] = await Promise.all([
      this.prisma.outboxEvent.count({
        where: { status: OutboxStatus.PENDING },
      }),
      this.prisma.outboxEvent.count({
        where: { status: OutboxStatus.FAILED },
      }),
      this.prisma.outboxEvent.count({
        where: { status: OutboxStatus.ENQUEUED },
      }),
      this.prisma.outboxEvent.count({
        where: { status: OutboxStatus.SENT },
      }),
    ]);

    return { pending, failed, enqueued, sent };
  }
}
