import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxStatus } from '@prisma/client';

export interface OutboxPayload {
  type: string;
  [key: string]: any;
}

@Injectable()
export class OutboxEventService {
  constructor(private prisma: PrismaService) {}

  /**
   * Tạo event trong outbox
   */
  async createEvent(
    topic: string,
    key: string,
    payload: OutboxPayload,
    dedupeKey?: string,
  ) {
    return this.prisma.outboxEvent.create({
      data: {
        topic,
        key,
        payload,
        dedupeKey,
        status: OutboxStatus.PENDING,
      },
    });
  }

  /**
   * Lấy events chưa enqueue
   */
  async getPendingEvents(limit: number = 100) {
    return this.prisma.outboxEvent.findMany({
      where: { status: OutboxStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Cập nhật status event
   */
  async updateEventStatus(
    eventId: string,
    status: OutboxStatus,
    error?: string,
  ) {
    const data: any = {
      status,
    };

    if (status === OutboxStatus.ENQUEUED) {
      data.enqueuedAt = new Date();
    } else if (status === OutboxStatus.SENT) {
      data.sentAt = new Date();
    } else if (status === OutboxStatus.FAILED) {
      data.error = error;
    }

    return this.prisma.outboxEvent.update({
      where: { id: eventId },
      data,
    });
  }

  /**
   * Lấy events bị failed
   */
  async getFailedEvents(limit: number = 100) {
    return this.prisma.outboxEvent.findMany({
      where: { status: OutboxStatus.FAILED },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Retry event bị failed
   */
  async retryEvent(eventId: string) {
    return this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxStatus.PENDING,
        attempts: { increment: 1 },
        error: null,
      },
    });
  }

  /**
   * Xóa events đã sent
   */
  async cleanupSentEvents(olderThanHours: number = 24) {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    return this.prisma.outboxEvent.deleteMany({
      where: {
        status: OutboxStatus.SENT,
        sentAt: {
          lt: cutoffTime,
        },
      },
    });
  }
}
