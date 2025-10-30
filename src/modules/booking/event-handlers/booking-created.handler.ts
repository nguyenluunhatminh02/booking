import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventBusService } from '@/core/events/event-bus.service';
import { OutboxEventService } from '@/modules/outbox/outbox-event.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/common/services/email.service';
import { NotificationService } from '@/common/services/notification.service';
import { AuditService } from '@/common/services/audit.service';
import { AnalyticsService } from '@/common/services/analytics.service';

/**
 * Booking Created Event Handler
 *
 * Triggered when: A new booking is created (status = DRAFT)
 *
 * Responsibilities:
 * 1. Send confirmation email to user
 * 2. Create notification
 * 3. Log audit event
 * 4. Update analytics/metrics
 *
 * Benefits of event-driven approach:
 * - Decouples booking creation from side effects
 * - Easy to add new handlers without modifying existing code
 * - Can be processed asynchronously via queue
 * - Resilient: retries via Outbox pattern
 */
@Injectable()
export class BookingCreatedHandler {
  constructor(
    @InjectPinoLogger(BookingCreatedHandler.name)
    private readonly logger: PinoLogger,
    private eventBus: EventBusService,
    private outboxEventService: OutboxEventService,
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private auditService: AuditService,
    private analyticsService: AnalyticsService,
  ) {}

  /**
   * Initialize handler (called in onModuleInit)
   */
  onModuleInit() {
    this.eventBus.subscribe('booking.created', (event) => this.handle(event));
    this.logger.info('BookingCreatedHandler initialized');
  }

  /**
   * Handle booking.created event
   */
  async handle(event: any) {
    try {
      this.logger.debug(
        { bookingId: event.data.bookingId },
        'Handling booking.created event',
      );

      const { bookingId, userId, amount, title, startTime } = event.data;

      // Step 1: Send confirmation email
      await this.sendConfirmationEmail(userId, bookingId, title, startTime);

      // Step 2: Create in-app notification
      await this.createNotification(userId, bookingId, title);

      // Step 3: Log audit event
      await this.logAuditEvent(userId, bookingId, amount);

      // Step 4: Update metrics (for analytics)
      await this.recordMetric('booking.created', { amount, title });

      this.logger.info(
        { bookingId, userId },
        'booking.created event handled successfully',
      );
    } catch (error) {
      this.logger.error(
        { bookingId: event.data.bookingId, error: (error as Error).message },
        'Error handling booking.created event',
      );
      // Re-throw to trigger retry mechanism via Outbox
      throw error;
    }
  }

  /**
   * Send confirmation email to user
   */
  private async sendConfirmationEmail(
    userId: string,
    bookingId: string,
    title: string,
    startTime: Date,
  ) {
    try {
      // Get user email from database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!user) {
        this.logger.warn({ userId }, 'User not found for email sending');
        return;
      }

      // Send email
      await this.emailService.sendMail({
        to: user.email,
        subject: `Booking Confirmation: ${title}`,
        html: `<p>Hello ${user.firstName},</p><p>Your booking "${title}" has been created successfully.</p><p>Scheduled for: ${startTime.toLocaleString('vi-VN')}</p><p><a href="${process.env.APP_URL}/bookings/${bookingId}">View Booking</a></p>`,
      });

      this.logger.info(
        { userId, bookingId, messageId: 'sent' },
        'Confirmation email sent',
      );
    } catch (error) {
      this.logger.error(
        { userId, bookingId, error: (error as Error).message },
        'Failed to send confirmation email',
      );
      // Don't throw - this is a side effect
    }
  }

  /**
   * Create in-app notification
   */
  private async createNotification(
    userId: string,
    bookingId: string,
    title: string,
  ) {
    try {
      await this.notificationService.createNotification(userId, {
        type: 'BOOKING_CREATED',
        title: 'Booking Created',
        message: `Your booking "${title}" has been created successfully.`,
        bookingId,
      });
      this.logger.debug({ userId, bookingId }, 'Notification created');
    } catch (error) {
      this.logger.error(
        { userId, bookingId, error: (error as Error).message },
        'Failed to create notification',
      );
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(userId: string, bookingId: string, amount: any) {
    try {
      await this.auditService.logEvent('BOOKING_CREATED', {
        userId,
        bookingId,
        resourceType: 'BOOKING',
        resourceId: bookingId,
        changes: { amount: amount.toString() },
      });
      this.logger.debug({ userId, bookingId }, 'Audit event logged');
    } catch (error) {
      this.logger.error(
        { userId, bookingId, error: (error as Error).message },
        'Failed to log audit event',
      );
    }
  }

  /**
   * Record metric for analytics
   */
  private async recordMetric(event: string, data: Record<string, any>) {
    try {
      await this.analyticsService.recordBookingMetric('CREATED', {
        bookingId: data.bookingId || 'unknown',
        amount: data.amount?.toString(),
      });
      this.logger.debug({ event, data }, 'Metric recorded');
    } catch (error) {
      this.logger.error(
        { event, error: (error as Error).message },
        'Failed to record metric',
      );
    }
  }
}
