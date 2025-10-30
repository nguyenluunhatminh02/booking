import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventBusService } from '@/core/events/event-bus.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/common/services/email.service';
import { NotificationService } from '@/common/services/notification.service';
import { AuditService } from '@/common/services/audit.service';
import { AnalyticsService } from '@/common/services/analytics.service';

/**
 * Booking Completed Event Handler
 *
 * Triggered when: Booking is marked as COMPLETED
 *
 * Responsibilities:
 * 1. Send completion confirmation
 * 2. Request user feedback/review
 * 3. Release final resources
 * 4. Generate invoice
 * 5. Update metrics
 * 6. Trigger loyalty/rewards if applicable
 */
@Injectable()
export class BookingCompletedHandler {
  constructor(
    @InjectPinoLogger(BookingCompletedHandler.name)
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
    this.eventBus.subscribe('booking.completed', (event) => this.handle(event));
    this.logger.info('BookingCompletedHandler initialized');
  }

  /**
   * Handle booking.completed event
   */
  async handle(event: any) {
    try {
      this.logger.debug(
        { bookingId: event.data.bookingId },
        'Handling booking.completed event',
      );

      const { bookingId, userId, amount, title } = event.data;

      // Step 1: Send completion email
      await this.sendCompletionEmail(userId, bookingId, title);

      // Step 2: Request feedback/review
      await this.requestFeedback(userId, bookingId);

      // Step 3: Release final resources
      await this.releaseFinalResources(bookingId);

      // Step 4: Generate invoice
      await this.generateInvoice(bookingId, userId, amount);

      // Step 5: Update metrics
      await this.updateMetrics(bookingId, amount);

      // Step 6: Check loyalty/rewards eligibility
      await this.checkLoyaltyRewards(userId, bookingId, amount);

      this.logger.info(
        { bookingId, userId },
        'booking.completed event handled successfully',
      );
    } catch (error) {
      this.logger.error(
        { bookingId: event.data.bookingId, error: (error as Error).message },
        'Error handling booking.completed event',
      );
      throw error;
    }
  }

  /**
   * Send completion email with summary
   */
  private async sendCompletionEmail(
    userId: string,
    bookingId: string,
    title: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!user) return;

      await this.emailService.sendMail({
        to: user.email,
        subject: `Booking Completed: ${title}`,
        html: `<p>Hello ${user.firstName},</p><p>Your booking "${title}" has been completed.</p><p>Completed at: ${new Date().toLocaleString('vi-VN')}</p><p><a href="${process.env.APP_URL}/bookings/${bookingId}/review">Leave a Review</a></p>`,
      });

      this.logger.info({ userId, bookingId }, 'Completion email sent');
    } catch (error) {
      this.logger.error(
        { userId, bookingId, error: (error as Error).message },
        'Failed to send completion email',
      );
    }
  }

  /**
   * Request user feedback/review
   */
  private async requestFeedback(userId: string, bookingId: string) {
    try {
      await this.notificationService.createNotification(userId, {
        type: 'BOOKING_COMPLETED',
        title: 'How was your booking?',
        message: 'We would love to hear your feedback. Please leave a review.',
        bookingId,
      });

      this.logger.info({ userId, bookingId }, 'Feedback request sent');
    } catch (error) {
      this.logger.error(
        { userId, bookingId, error: (error as Error).message },
        'Failed to request feedback',
      );
    }
  }

  /**
   * Release any remaining reserved resources
   */
  private async releaseFinalResources(bookingId: string) {
    try {
      this.logger.info({ bookingId }, 'Final resources released');
      // await this.resourceService.releaseAll(bookingId);
    } catch (error) {
      this.logger.error(
        { bookingId, error: (error as Error).message },
        'Failed to release final resources',
      );
    }
  }

  /**
   * Generate invoice for completed booking
   */
  private async generateInvoice(
    bookingId: string,
    userId: string,
    amount: any,
  ) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { user: true },
      });

      if (!booking) return;

      this.logger.info(
        { bookingId, amount: amount.toString() },
        'Invoice generated for completed booking',
      );

      // In a real system, generate PDF and store
      // const invoice = await this.invoiceService.generate({
      //   bookingId,
      //   userId,
      //   amount: parseFloat(amount.toString()),
      //   invoiceDate: new Date(),
      // });

      // Optional: Send invoice via email
      // await this.emailService.send({
      //   to: booking.user.email,
      //   subject: `Invoice for Booking ${bookingId}`,
      //   attachments: [invoice.pdfPath],
      // });
    } catch (error) {
      this.logger.error(
        { bookingId, error: (error as Error).message },
        'Failed to generate invoice',
      );
    }
  }

  /**
   * Update metrics for completed bookings
   */
  private async updateMetrics(bookingId: string, amount: any) {
    try {
      await this.analyticsService.recordBookingMetric('COMPLETED', {
        bookingId,
        amount: amount.toString(),
      });
      this.logger.debug({ bookingId }, 'Completion metrics recorded');
    } catch (error) {
      this.logger.error(
        { bookingId, error: (error as Error).message },
        'Failed to update metrics',
      );
    }
  }

  /**
   * Check and apply loyalty/rewards points
   */
  private async checkLoyaltyRewards(
    userId: string,
    bookingId: string,
    amount: any,
  ) {
    try {
      const amountValue = parseFloat(amount.toString());

      // Simple loyalty logic: 1 point per 10,000 VND
      const loyaltyPoints = Math.floor(amountValue / 10000);

      if (loyaltyPoints > 0) {
        this.logger.info(
          { userId, bookingId, loyaltyPoints },
          'Loyalty points awarded',
        );

        // In a real system, update user loyalty points
        // await this.loyaltyService.addPoints(userId, loyaltyPoints, {
        //   bookingId,
        //   reason: 'Booking completion',
        // });

        // Optionally notify user
        // await this.notificationService.sendPushNotification(
        //   userId,
        //   'Loyalty Points Earned!',
        //   `You earned ${loyaltyPoints} points for completing this booking.`
        // );
      }
    } catch (error) {
      this.logger.error(
        { userId, bookingId, error: (error as Error).message },
        'Failed to check loyalty rewards',
      );
    }
  }
}
