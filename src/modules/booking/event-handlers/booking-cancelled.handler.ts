import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventBusService } from '@/core/events/event-bus.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/common/services/email.service';
import { NotificationService } from '@/common/services/notification.service';
import { AuditService } from '@/common/services/audit.service';
import { AnalyticsService } from '@/common/services/analytics.service';

/**
 * Booking Cancelled Event Handler
 *
 * Triggered when: Booking is cancelled
 *
 * Responsibilities:
 * 1. Release reserved resources
 * 2. Cancel calendar invitations
 * 3. Send cancellation email
 * 4. Issue refund (if paid)
 * 5. Notify relevant parties
 * 6. Update analytics
 */
@Injectable()
export class BookingCancelledHandler {
  constructor(
    @InjectPinoLogger(BookingCancelledHandler.name)
    private readonly logger: PinoLogger,
    private eventBus: EventBusService,
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
    this.eventBus.subscribe('booking.cancelled', (event) => this.handle(event));
    this.logger.info('BookingCancelledHandler initialized');
  }

  /**
   * Handle booking.cancelled event
   */
  async handle(event: any) {
    try {
      this.logger.debug(
        { bookingId: event.data.bookingId },
        'Handling booking.cancelled event',
      );

      const { bookingId, userId, refundAmount, reason } = event.data;

      // Type-safe string conversions
      const bookingIdStr = String(bookingId);
      const userIdStr = String(userId);
      const reasonStr = reason ? String(reason) : '';
      const refundAmountStr = refundAmount ? String(refundAmount) : '0';

      // Step 1: Release reserved resources
      await this.releaseResources(bookingIdStr);

      // Step 2: Cancel calendar invitations
      await this.cancelCalendarInvite(bookingIdStr);

      // Step 3: Send cancellation email
      await this.sendCancellationEmail(userIdStr, bookingIdStr, reasonStr);

      // Step 4: Process refund
      if (refundAmountStr && parseFloat(refundAmountStr) > 0) {
        await this.processRefund(bookingIdStr, refundAmountStr);
      }

      // Step 5: Send notification
      await this.sendCancellationNotification(userIdStr, bookingIdStr);

      // Step 6: Record analytics
      await this.recordAnalytics(bookingIdStr, refundAmountStr);

      this.logger.info(
        { bookingId, userId },
        'booking.cancelled event handled successfully',
      );
    } catch (error) {
      this.logger.error(
        { bookingId: event.data.bookingId, error: (error as Error).message },
        'Error handling booking.cancelled event',
      );
      throw error;
    }
  }

  /**
   * Release reserved resources
   */
  private async releaseResources(bookingId: string): Promise<void> {
    try {
      this.logger.info({ bookingId }, 'Released reserved resources');
      // In a real system, call inventory/resource service to release resources
      // await this.resourceService.release(bookingId);
      await Promise.resolve(); // Placeholder - add actual implementation
    } catch (error) {
      this.logger.error(
        { bookingId, error: (error as Error).message },
        'Failed to release resources',
      );
    }
  }

  /**
   * Cancel calendar invitations
   */
  private async cancelCalendarInvite(bookingId: string): Promise<void> {
    try {
      this.logger.info({ bookingId }, 'Calendar invitations cancelled');
      // In a real system, call calendar service
      // await this.calendarService.cancelEvent(bookingId);
      await Promise.resolve(); // Placeholder - add actual implementation
    } catch (error) {
      this.logger.error(
        { bookingId, error: (error as Error).message },
        'Failed to cancel calendar invitations',
      );
    }
  }

  /**
   * Send cancellation email
   */
  private async sendCancellationEmail(
    userId: string,
    bookingId: string,
    reason: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!user) return;

      await this.emailService.sendMail({
        to: user.email,
        subject: `Booking Cancelled: ${bookingId}`,
        html: `<p>Hello ${user.firstName},</p><p>Your booking has been cancelled.</p><p>Reason: ${reason}</p><p>Date: ${new Date().toLocaleString('vi-VN')}</p>`,
      });

      this.logger.info({ userId, bookingId }, 'Cancellation email sent');
    } catch (error) {
      this.logger.error(
        { userId, bookingId, error: (error as Error).message },
        'Failed to send cancellation email',
      );
    }
  }

  /**
   * Process refund (if payment was made)
   */
  private async processRefund(bookingId: string, refundAmount: string) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) return;

      this.logger.info(
        { bookingId, refundAmount },
        'Processing refund to customer',
      );

      // In a real system, process refund via payment gateway
      // await this.paymentService.refund({
      //   bookingId,
      //   amount: parseFloat(refundAmount),
      //   originalPaymentId: booking.payments[0]?.id,
      // });

      // Record audit event
      await this.auditService.logEvent('PAYMENT_REFUNDED', {
        userId: booking.userId,
        bookingId,
        resourceType: 'PAYMENT',
        resourceId: bookingId,
        changes: { amount: refundAmount },
      });
    } catch (error) {
      this.logger.error(
        { bookingId, error: (error as Error).message },
        'Failed to process refund',
      );
    }
  }

  /**
   * Send cancellation notification
   */
  private async sendCancellationNotification(
    userId: string,
    bookingId: string,
  ) {
    try {
      await this.notificationService.createNotification(userId, {
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled',
        message: 'Your booking has been cancelled by customer request',
        bookingId,
      });
      this.logger.info({ userId, bookingId }, 'Cancellation notification sent');
    } catch (error) {
      this.logger.error(
        { userId, bookingId, error: (error as Error).message },
        'Failed to send cancellation notification',
      );
    }
  }

  /**
   * Record analytics for cancelled bookings
   */
  private async recordAnalytics(bookingId: string, refundAmount: string) {
    try {
      await this.analyticsService.recordBookingMetric('CANCELLED', {
        bookingId,
        amount: refundAmount,
      });
      this.logger.debug({ bookingId }, 'Cancellation analytics recorded');
    } catch (error) {
      this.logger.error(
        { bookingId, error: (error as Error).message },
        'Failed to record analytics',
      );
    }
  }
}
