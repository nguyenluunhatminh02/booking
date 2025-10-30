import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxEventService } from '@/modules/outbox/outbox-event.service';
import { SagaOrchestrator, BookingCancellationSaga } from '@/core/sagas';
import { UseCase, ValidationError, BusinessLogicError } from './base.use-case';

/**
 * Request for cancelling a booking
 */
export class CancelBookingRequest {
  bookingId: string;
  userId: string;
  reason?: string;
  refundAmount?: string | number;
}

/**
 * Response after cancelling a booking
 */
export class CancelBookingResponse {
  id: string;
  status: string;
  cancelledAt: Date;
  refundAmount: Decimal;
  updatedAt: Date;
}

/**
 * Cancel Booking Use Case with Refund Processing
 *
 * Business Logic:
 * 1. Verify booking exists and belongs to user
 * 2. Validate status (cannot cancel if COMPLETED, CANCELLED, REFUNDED)
 * 3. Determine refund amount (default to finalAmount)
 * 4. Execute saga for distributed transaction (booking + payment refund)
 * 5. Publish event on success
 *
 * Status transitions allowed:
 * - DRAFT -> CANCELLED
 * - PENDING -> CANCELLED
 * - CONFIRMED -> CANCELLED (with refund)
 *
 * Uses Saga Pattern for handling:
 * - Booking status update
 * - Payment refund processing
 * - Automatic compensation if refund fails
 */
@Injectable()
export class CancelBookingUseCase extends UseCase<
  CancelBookingRequest,
  CancelBookingResponse
> {
  constructor(
    private prisma: PrismaService,
    private outboxEventService: OutboxEventService,
    private sagaOrchestrator: SagaOrchestrator,
    private bookingCancellationSaga: BookingCancellationSaga,
  ) {
    super();
  }

  /**
   * Validate the cancel request
   */
  protected validate(request: CancelBookingRequest): void {
    if (!request.bookingId) {
      throw new ValidationError('Booking ID is required');
    }

    if (!request.userId) {
      throw new ValidationError('User ID is required');
    }

    if (request.refundAmount) {
      const amount = new Decimal(request.refundAmount);
      if (amount.lessThan(0)) {
        throw new ValidationError('Refund amount cannot be negative');
      }
    }
  }

  /**
   * Execute the use case
   */
  async execute(request: CancelBookingRequest): Promise<CancelBookingResponse> {
    try {
      // Step 1: Validate input
      this.validate(request);

      // Step 2: Fetch booking
      const booking = await this.prisma.booking.findUnique({
        where: { id: request.bookingId },
      });

      if (!booking) {
        throw new Error(`Booking with ID "${request.bookingId}" not found`);
      }

      // Step 3: Verify ownership
      if (booking.userId !== request.userId) {
        throw new BusinessLogicError(
          'You do not have permission to cancel this booking',
        );
      }

      // Step 4: Validate status - cannot cancel completed/cancelled/refunded bookings
      const cancelledStatuses = ['COMPLETED', 'CANCELLED', 'REFUNDED'];
      if (cancelledStatuses.includes(booking.status)) {
        throw new BusinessLogicError(
          `Cannot cancel booking with status ${booking.status}`,
        );
      }

      // Step 5: Determine refund amount
      const refundAmount = request.refundAmount
        ? new Decimal(request.refundAmount)
        : new Decimal(booking.finalAmount.toString());

      if (refundAmount.greaterThan(booking.finalAmount)) {
        throw new BusinessLogicError(
          'Refund amount cannot exceed booking final amount',
        );
      }

      // Step 6: Execute saga for distributed cancellation
      // This handles both booking update and payment refund with compensation
      const sagaResult = await this.sagaOrchestrator.execute(
        this.bookingCancellationSaga,
        {
          bookingId: request.bookingId,
          userId: request.userId,
          refundAmount: refundAmount,
          reason: request.reason || 'Customer requested cancellation',
        },
      );

      if (!sagaResult.success) {
        throw new BusinessLogicError(
          `Cancellation failed: ${sagaResult.error || 'Unknown error'}`,
        );
      }

      // Step 7: Update booking status to CANCELLED
      const updated = await this.prisma.booking.update({
        where: { id: request.bookingId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          notes: `${booking.notes || ''}\n[CANCELLED] ${request.reason || 'No reason provided'}`,
        },
      });

      // Step 8: Publish event for async processing (notifications, etc.)
      await this.outboxEventService.createEvent(
        'booking.events',
        `cancel-${request.bookingId}`,
        {
          type: 'booking.cancelled',
          bookingId: request.bookingId,
          userId: request.userId,
          refundAmount: refundAmount.toString(),
          reason: request.reason,
          cancelledAt: new Date(),
        },
      );

      // Step 9: Return response
      return {
        id: updated.id,
        status: updated.status,
        cancelledAt: updated.cancelledAt!,
        refundAmount,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      return this.mapError(error as Error);
    }
  }
}
