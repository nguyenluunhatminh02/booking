import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxStatus } from '@prisma/client';
import { UserEventsHandler } from './handlers/user-events.handler';

@Injectable()
@Processor('outbox')
export class OutboxWorker extends WorkerHost {
  private readonly logger = new Logger(OutboxWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userEventsHandler: UserEventsHandler,
  ) {
    super();
  }

  async process(job: Job) {
    const { outboxId } = job.data as { outboxId: string };
    const evt = await this.prisma.outboxEvent.findUnique({
      where: { id: outboxId },
    });
    if (!evt) {
      this.logger.warn(`Outbox event ${outboxId} not found`);
      return;
    }

    try {
      await this.handleEvent(evt.topic, evt.payload as any);

      await this.prisma.outboxEvent.update({
        where: { id: outboxId },
        data: {
          status: OutboxStatus.SENT,
          sentAt: new Date(),
          attempts: { increment: 1 },
          error: null,
        },
      });

      this.logger.log(`Processed outbox event ${outboxId}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.prisma.outboxEvent.update({
        where: { id: outboxId },
        data: {
          status: OutboxStatus.FAILED,
          attempts: { increment: 1 },
          error: message.slice(0, 500),
        },
      });

      this.logger.error(`Failed to process outbox event ${outboxId}: ${message}`);
      throw e;
    }
  }

  private async handleEvent(topic: string, payload: any): Promise<void> {
    switch (topic) {
      case 'user.events':
        await this.userEventsHandler.handle(payload);
        break;
      default:
        this.logger.warn(`No handler registered for outbox topic ${topic}`);
    }
  }
}
