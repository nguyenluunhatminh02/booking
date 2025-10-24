import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
@Processor('outbox')
export class OutboxWorker extends WorkerHost {
  private readonly logger = new Logger(OutboxWorker.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    const { outboxId } = job.data as { outboxId: string };
    const evt = await this.prisma.outboxEvent.findUnique({
      where: { id: outboxId },
    });
    if (!evt) return;

    try {
      const p = evt.payload as any;
      switch (evt.topic) {
        case 'user.events':
          if (p.type === 'USER_REGISTERED') {
            // TODO: gửi email chào mừng / webhook
          }
          break;
        // case 'order.events': ...
      }

      await this.prisma.outboxEvent.update({
        where: { id: outboxId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          attempts: { increment: 1 },
          error: null,
        },
      });
    } catch (e) {
      await this.prisma.outboxEvent.update({
        where: { id: outboxId },
        data: {
          status: 'ENQUEUED',
          attempts: { increment: 1 },
          error: String(e).slice(0, 500),
        },
      });
      throw e;
    }
  }
}
