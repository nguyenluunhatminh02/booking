import { Injectable } from '@nestjs/common';
import { Saga } from './saga.base';
import { SagaStep, SagaContext } from './saga.types';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxEventService } from '@/modules/outbox/outbox-event.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Context for booking cancellation saga
 */
export interface BookingCancellationContext extends SagaContext {
  bookingId: string;
  userId: string;
  reason: string;
  refundAmount?: Decimal;
  inventoryReleased?: boolean;
  paymentRefunded?: boolean;
  emailSent?: boolean;
}

/**
 * Saga for booking cancellation with compensation
 *
 * Flow:
 * 1. Release hold on inventory
 *    Compensate: Re-hold inventory
 * 2. Process payment refund
 *    Compensate: Re-charge payment
 * 3. Send cancellation email (optional, non-blocking)
 * 4. Update booking status to REFUNDED
 */
@Injectable()
export class BookingCancellationSaga extends Saga<BookingCancellationContext> {
  protected readonly steps: SagaStep<BookingCancellationContext>[] = [
    {
      name: 'releaseInventory',
      execute: async (ctx) => this.releaseInventory(ctx),
      compensate: async (ctx) => this.reholdInventory(ctx),
    },
    {
      name: 'processRefund',
      execute: async (ctx) => this.processRefund(ctx),
      compensate: async (ctx) => this.reverseRefund(ctx),
    },
    {
      name: 'sendCancellationEmail',
      execute: async (ctx) => this.sendCancellationEmail(ctx),
      optional: true, // Email failure shouldn't block saga
    },
    {
      name: 'updateBookingStatus',
      execute: async (ctx) => this.updateBookingStatus(ctx),
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxEventService,
  ) {
    super();
  }

  /**
   * Step 1: Release inventory hold
   */
  private async releaseInventory(
    ctx: BookingCancellationContext,
  ): Promise<void> {
    this.logger.log(`Releasing inventory hold for booking: ${ctx.bookingId}`);

    // TODO: Integrate with inventory service
    // For now, just mark as released
    ctx.inventoryReleased = true;

    // In real implementation:
    // const result = await this.inventoryService.release(ctx.bookingId);
    // if (!result.success) throw new Error('Failed to release inventory');
    return Promise.resolve();
  }

  /**
   * Compensation for Step 1: Re-hold inventory
   */
  private async reholdInventory(
    ctx: BookingCancellationContext,
  ): Promise<void> {
    if (!ctx.inventoryReleased) {
      return; // Never released, nothing to restore
    }

    this.logger.warn(
      `Compensation: Re-holding inventory for booking: ${ctx.bookingId}`,
    );

    // TODO: Integrate with inventory service
    // const result = await this.inventoryService.rehold(ctx.bookingId);
    // if (!result.success) throw new Error('Failed to re-hold inventory');
    return Promise.resolve();
  }

  /**
   * Step 2: Process payment refund
   */
  private async processRefund(ctx: BookingCancellationContext): Promise<void> {
    this.logger.log(`Processing refund for booking: ${ctx.bookingId}`);

    const booking = await this.prisma.booking.findUnique({
      where: { id: ctx.bookingId },
    });

    if (!booking) {
      throw new Error(`Booking ${ctx.bookingId} not found`);
    }

    const refundAmount = ctx.refundAmount || booking.finalAmount;

    // TODO: Integrate with payment service
    // const refund = await this.paymentService.refund(ctx.bookingId, refundAmount);
    // if (!refund.success) throw new Error(`Refund failed: ${refund.error}`);

    ctx.paymentRefunded = true;
    ctx.refundAmount = refundAmount;

    this.logger.log(
      `Refund processed: ${String(refundAmount)} for booking ${ctx.bookingId}`,
    );
  }

  /**
   * Compensation for Step 2: Reverse refund (re-charge)
   */
  private async reverseRefund(ctx: BookingCancellationContext): Promise<void> {
    if (!ctx.paymentRefunded) {
      return; // Never refunded, nothing to reverse
    }

    this.logger.warn(
      `Compensation: Re-charging ${String(ctx.refundAmount)} for booking: ${ctx.bookingId}`,
    );

    // TODO: Integrate with payment service
    // const charge = await this.paymentService.charge(
    //   ctx.bookingId,
    //   ctx.refundAmount,
    // );
    return Promise.resolve();
  }

  /**
   * Step 3: Send cancellation email (optional)
   */
  private async sendCancellationEmail(
    ctx: BookingCancellationContext,
  ): Promise<void> {
    this.logger.log(`Sending cancellation email for booking: ${ctx.bookingId}`);

    // TODO: Integrate with mail service or enqueue email job
    // try {
    //   await this.mailService.sendBookingCancellation(
    //     ctx.bookingId,
    //     ctx.userId,
    //     ctx.reason,
    //   );
    // } catch (error) {
    //   this.logger.warn(`Failed to send email: ${error.message}`);
    //   // Don't throw - this is optional
    // }
    return Promise.resolve();
  }

  /**
   * Step 4: Update booking status to REFUNDED
   */
  private async updateBookingStatus(
    ctx: BookingCancellationContext,
  ): Promise<void> {
    this.logger.log(`Updating booking status to REFUNDED: ${ctx.bookingId}`);

    await this.prisma.booking.update({
      where: { id: ctx.bookingId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundReason: ctx.reason,
      },
    });

    // Publish event via outbox
    await this.outboxService.createEvent(
      'booking.events',
      `refund-${ctx.bookingId}`,
      {
        type: 'booking.refunded',
        bookingId: ctx.bookingId,
        userId: ctx.userId,
        refundAmount: ctx.refundAmount?.toString(),
        reason: ctx.reason,
      },
    );

    this.logger.log(
      `Booking status updated and event published: ${ctx.bookingId}`,
    );
  }
}
