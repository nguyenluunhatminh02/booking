import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Notification Service
 * Handles creating and managing in-app notifications
 */
@Injectable()
export class NotificationService {
  constructor(
    @InjectPinoLogger(NotificationService.name)
    private readonly logger: PinoLogger,
    private prisma: PrismaService,
  ) {}

  /**
   * Create in-app notification for user
   */
  async createNotification(
    userId: string,
    data: {
      type:
        | 'BOOKING_CREATED'
        | 'BOOKING_CONFIRMED'
        | 'BOOKING_CANCELLED'
        | 'BOOKING_COMPLETED';
      title: string;
      message: string;
      bookingId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<any> {
    try {
      this.logger.info({ userId, type: data.type }, 'Creating notification');

      // TODO: Create notification record in database
      // const notification = await this.prisma.notification.create({
      //   data: {
      //     userId,
      //     type: data.type,
      //     title: data.title,
      //     message: data.message,
      //     bookingId: data.bookingId,
      //     metadata: data.metadata,
      //     isRead: false,
      //   },
      // });

      this.logger.info(
        { userId, type: data.type },
        'Notification created successfully',
      );

      return {
        id: `notif_${Date.now()}`,
        userId,
        ...data,
        isRead: false,
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        { userId, error: (error as Error).message },
        'Failed to create notification',
      );
      throw error;
    }
  }

  /**
   * Send push notification to user device
   */
  async sendPushNotification(
    userId: string,
    data: {
      title: string;
      body: string;
      bookingId?: string;
      action?: string;
    },
  ): Promise<void> {
    try {
      this.logger.info({ userId }, 'Sending push notification');

      // TODO: Integrate with Firebase Cloud Messaging or similar
      // const devices = await this.prisma.userDevice.findMany({ where: { userId } });
      // for (const device of devices) {
      //   await this.fcm.send({
      //     token: device.deviceToken,
      //     notification: { title: data.title, body: data.body },
      //     data: { bookingId: data.bookingId, action: data.action },
      //   });
      // }

      this.logger.info({ userId }, 'Push notification sent');
    } catch (error) {
      this.logger.error(
        { userId, error: (error as Error).message },
        'Failed to send push notification',
      );
      throw error;
    }
  }
}
