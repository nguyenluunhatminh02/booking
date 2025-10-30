import { Injectable } from '@nestjs/common';
import { Saga } from './saga.base';
import { SagaStep, SagaContext } from './saga.types';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxEventService } from '@/modules/outbox/outbox-event.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Context for booking payment saga
 */
export interface BookingPaymentContext extends SagaContext {
  bookingId: string;
  userId: string;
  amount: Decimal;
  paymentMethod: string;
  chargeId?: string;
  inventoryHeld?: boolean;
  paymentAuthorized?: boolean;
  paymentCaptured?: boolean;
}

/**
 * Saga for booking payment processing
 *
 * Flow:
 * 1. Validate booking and inventory availability
 * 2. Hold inventory
 *    Compensate: Release inventory
 * 3. Authorize payment
 *    Compensate: Release authorization
 * 4. Capture payment
 *    Compensate: Void/refund payment
 * 5. Update booking to PAID
 * 6. Publish success event
 */
@Injectable()
export class BookingPaymentSaga extends Saga<BookingPaymentContext> {
  protected readonly steps: SagaStep<BookingPaymentContext>[] = [
    {
      name: 'validateBooking',
      execute: async (ctx) => this.validateBooking(ctx),
    },
    {
      name: 'holdInventory',
      execute: async (ctx) => this.holdInventory(ctx),
      compensate: async (ctx) => this.releaseInventory(ctx),
    },
    {
      name: 'authorizePayment',
      execute: async (ctx) => this.authorizePayment(ctx),
      compensate: async (ctx) => this.releaseAuthorization(ctx),
    },
    {
      name: 'capturePayment',
      execute: async (ctx) => this.capturePayment(ctx),
      compensate: async (ctx) => this.voidPayment(ctx),
    },
    {
      name: 'updateBookingStatus',
      execute: async (ctx) => this.updateBookingStatus(ctx),
    },
    {
      name: 'publishEvent',
      execute: async (ctx) => this.publishEvent(ctx),
      optional: true, // Event publish failure shouldn't block
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxEventService,
  ) {
    super();
  }

  /**
   * Step 1: Validate booking exists and is in correct status
   */
  private async validateBooking(ctx: BookingPaymentContext): Promise<void> {
    this.logger.log(`Validating booking: ${ctx.bookingId}`);

    const booking = await this.prisma.booking.findUnique({
      where: { id: ctx.bookingId },
    });

    if (!booking) {
      throw new Error(`Booking ${ctx.bookingId} not found`);
    }

    if (booking.status !== 'CONFIRMED') {
      throw new Error(
        `Cannot process payment for booking with status ${booking.status}`,
      );
    }

    if (!booking.userId || booking.userId !== ctx.userId) {
      throw new Error(`Unauthorized: booking does not belong to user`);
    }

    this.logger.log(`Booking validated: ${ctx.bookingId}`);
  }

  /**
   * Step 2: Hold inventory
   */
  private async holdInventory(ctx: BookingPaymentContext): Promise<void> {
    this.logger.log(`Holding inventory for booking: ${ctx.bookingId}`);

    // TODO: Integrate with inventory service
    // const hold = await this.inventoryService.hold(ctx.bookingId);
    // if (!hold.success) throw new Error('Failed to hold inventory');

    ctx.inventoryHeld = true;
    return Promise.resolve();
  }

  /**
   * Compensation for Step 2: Release inventory
   */
  private async releaseInventory(ctx: BookingPaymentContext): Promise<void> {
    if (!ctx.inventoryHeld) return;

    this.logger.warn(
      `Compensation: Releasing inventory for booking: ${ctx.bookingId}`,
    );

    // TODO: Integrate with inventory service
    // await this.inventoryService.release(ctx.bookingId);
  }

  /**
   * Step 3: Authorize payment
   */
  private async authorizePayment(ctx: BookingPaymentContext): Promise<void> {
    this.logger.log(
      `Authorizing payment: ${ctx.amount} for booking: ${ctx.bookingId}`,
    );

    // TODO: Integrate with payment provider
    // const auth = await this.paymentService.authorize({
    //   amount: ctx.amount,
    //   currency: 'VND',
    //   paymentMethod: ctx.paymentMethod,
    //   idempotencyKey: `auth-${ctx.bookingId}`,
    // });
    // if (!auth.success) throw new Error(auth.error);
    // ctx.chargeId = auth.chargeId;

    ctx.paymentAuthorized = true;
  }

  /**
   * Compensation for Step 3: Release authorization
   */
  private async releaseAuthorization(
    ctx: BookingPaymentContext,
  ): Promise<void> {
    if (!ctx.paymentAuthorized || !ctx.chargeId) return;

    this.logger.warn(
      `Compensation: Releasing authorization for charge: ${ctx.chargeId}`,
    );

    // TODO: Integrate with payment provider
    // await this.paymentService.void({
    //   chargeId: ctx.chargeId,
    //   idempotencyKey: `void-${ctx.chargeId}`,
    // });
  }

  /**
   * Step 4: Capture payment
   */
  private async capturePayment(ctx: BookingPaymentContext): Promise<void> {
    if (!ctx.chargeId) {
      throw new Error('No charge ID for payment capture');
    }

    this.logger.log(`Capturing payment: ${ctx.chargeId}`);

    // TODO: Integrate with payment provider
    // const capture = await this.paymentService.capture({
    //   chargeId: ctx.chargeId,
    //   idempotencyKey: `capture-${ctx.chargeId}`,
    // });
    // if (!capture.success) throw new Error(capture.error);

    ctx.paymentCaptured = true;
  }

  /**
   * Compensation for Step 4: Void/Refund payment
   */
  private async voidPayment(ctx: BookingPaymentContext): Promise<void> {
    if (!ctx.paymentCaptured || !ctx.chargeId) return;

    this.logger.warn(`Compensation: Refunding payment: ${ctx.chargeId}`);

    // TODO: Integrate with payment provider
    // await this.paymentService.refund({
    //   chargeId: ctx.chargeId,
    //   idempotencyKey: `refund-${ctx.chargeId}`,
    // });
  }

  /**
   * Step 5: Update booking status to PAID
   */
  private async updateBookingStatus(ctx: BookingPaymentContext): Promise<void> {
    this.logger.log(`Updating booking status to PAID: ${ctx.bookingId}`);

    await this.prisma.booking.update({
      where: { id: ctx.bookingId },
      data: {
        status: 'PAID',
      },
    });
  }

  /**
   * Step 6: Publish success event
   */
  private async publishEvent(ctx: BookingPaymentContext): Promise<void> {
    this.logger.log(`Publishing payment success event: ${ctx.bookingId}`);

    await this.outboxService.createEvent(
      'booking.events',
      `payment-${ctx.bookingId}`,
      {
        type: 'booking.payment_completed',
        bookingId: ctx.bookingId,
        userId: ctx.userId,
        amount: ctx.amount.toString(),
        chargeId: ctx.chargeId,
      },
    );
  }
}
