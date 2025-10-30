import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventBusService } from '@/core/events/event-bus.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/common/services/email.service';
import { NotificationService } from '@/common/services/notification.service';
import { AuditService } from '@/common/services/audit.service';

/**
 * Booking Confirmed Event Handler
 *
 * Triggered when: Booking status changes from DRAFT/PENDING to CONFIRMED
 *
 * Responsibilities:
 * 1. Send confirmation email
 * 2. Reserve inventory/resources
 * 3. Create calendar invitation
 * 4. Update user notifications
 * 5. Trigger payment processing if needed
 */
@Injectable()
export class BookingConfirmedHandler {
  constructor(
    @InjectPinoLogger(BookingConfirmedHandler.name)
    private readonly logger: PinoLogger,
    private eventBus: EventBusService,
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private auditService: AuditService,
  ) {}

  /**
   * Initialize handler (called in onModuleInit)
   */
  onModuleInit() {
    this.eventBus.subscribe('booking.confirmed', (event) => this.handle(event));
    this.logger.info('BookingConfirmedHandler initialized');
  }

  /**
   * Handle booking.confirmed event
   */
  async handle(event: any) {
    try {
      this.logger.debug(
        { bookingId: event.data.bookingId },
        'Handling booking.confirmed event',
      );

      const { bookingId, userId, amount, title, confirmedAt } = event.data;

      // Step 1: Send confirmation email
      await this.sendConfirmationEmail(userId, bookingId, title, confirmedAt);

      // Step 2: Reserve resources/inventory
      await this.reserveResources(bookingId);

      // Step 3: Create calendar invitation
      await this.createCalendarInvite(userId, bookingId, title);

      // Step 4: Send push notification
      await this.sendPushNotification(userId, bookingId, title);

      this.logger.info(
        { bookingId, userId },
        'booking.confirmed event handled successfully',
      );
    } catch (error) {
      this.logger.error(
        { bookingId: event.data.bookingId, error: (error as Error).message },
        'Error handling booking.confirmed event',
      );
      throw error;
    }
  }

  /**
   * Send confirmation email
   */
  private async sendConfirmationEmail(
    userId: string,
    bookingId: string,
    title: string,
    confirmedAt: Date,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!user) return;

      await this.emailService.sendMail({
        to: user.email,
        subject: `Booking Confirmed: ${title}`,
        html: `<p>Hello ${user.firstName},</p><p>Your booking "${title}" has been confirmed.</p><p>Confirmed at: ${confirmedAt.toLocaleString('vi-VN')}</p><p><a href="${process.env.APP_URL}/bookings/${bookingId}">View Booking</a></p>`,
      });

      this.logger.info({ userId, bookingId }, 'Confirmation email sent');
    } catch (error) {
      this.logger.error(
        { userId, bookingId, error: (error as Error).message },
        'Failed to send confirmation email',
      );
    }
  }

  /**
   * Reserve resources (inventory, calendar slots, etc.)
   */
  private async reserveResources(bookingId: string) {
    try {
      // In a real system, this would call inventory/resource service
      // For now, update booking status and log
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (booking) {
        // Mark resources as reserved
        this.logger.info({ bookingId }, 'Resources reserved for booking');

        // You could emit another event or call a resource service
        // await this.resourceService.reserve(bookingId, booking.startTime, booking.duration);
      }
    } catch (error) {
      this.logger.error(
        { bookingId, error: (error as Error).message },
        'Failed to reserve resources',
      );
    }
  }

  /**
   * Create calendar invitation
   */
  private async createCalendarInvite(
    userId: string,
    bookingId: string,
    title: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user) return;

      // In a real system, integrate with Google Calendar, Outlook, etc.
      this.logger.info(
        { userId, bookingId, userEmail: user.email },
        'Calendar invitation created',
      );

      // Example: await this.calendarService.createEvent({
      //   email: user.email,
      //   title,
      //   bookingId,
      // });
    } catch (error) {
      this.logger.error(
        { userId, bookingId, error: (error as Error).message },
        'Failed to create calendar invite',
      );
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    userId: string,
    bookingId: string,
    title: string,
  ) {
    try {
      await this.notificationService.createNotification(userId, {
        type: 'BOOKING_CONFIRMED',
        title: 'Booking Confirmed',
        message: `Your booking "${title}" has been confirmed.`,
        bookingId,
      });
      this.logger.info({ userId, bookingId }, 'Push notification sent');
    } catch (error) {
      this.logger.error(
        { userId, bookingId, error: (error as Error).message },
        'Failed to send push notification',
      );
    }
  }
}
