import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

type Tx = Prisma.TransactionClient;

@Injectable()
export class OutboxProducer {
  private readonly logger = new Logger(OutboxProducer.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Emit outbox event within a transaction
   */
  async emitInTx(
    tx: Tx,
    topic: string,
    key: string,
    payload: any,
    dedupeKey?: string,
  ): Promise<void> {
    try {
      await (tx as any).outboxEvent.create({
        data: {
          topic,
          key,
          payload,
          dedupeKey,
          createdAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error(`Failed to emit outbox event: ${topic}`, err);
      // Don't throw - outbox is best-effort
    }
  }

  /**
   * Emit outbox event outside a transaction
   */
  async emit(
    topic: string,
    key: string,
    payload: any,
    dedupeKey?: string,
  ): Promise<void> {
    try {
      await this.prisma.outboxEvent.create({
        data: {
          topic,
          key,
          payload,
          dedupeKey,
          createdAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error(`Failed to emit outbox event: ${topic}`, err);
      // Don't throw - outbox is best-effort
    }
  }
}
