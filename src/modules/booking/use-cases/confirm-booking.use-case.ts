import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxEventService } from '@/modules/outbox/outbox-event.service';
import { UseCase, ValidationError, BusinessLogicError } from './base.use-case';

/**
 * Request for confirming a booking
 */
export class ConfirmBookingRequest {
  bookingId: string;
  userId: string;
}

/**
 * Response after confirming a booking
 */
export class ConfirmBookingResponse {
  id: string;
  status: string;
  confirmedAt: Date;
  updatedAt: Date;
}

/**
 * Confirm Booking Use Case
 *
 * Business Logic:
 * 1. Verify booking exists and belongs to user
 * 2. Validate status transition (DRAFT/PENDING -> CONFIRMED)
 * 3. Set confirmed timestamp
 * 4. Publish booking.confirmed event
 *
 * Status transitions allowed:
 * - DRAFT -> CONFIRMED
 * - PENDING -> CONFIRMED
 */
@Injectable()
export class ConfirmBookingUseCase extends UseCase<
  ConfirmBookingRequest,
  ConfirmBookingResponse
> {
  constructor(
    private prisma: PrismaService,
    private outboxEventService: OutboxEventService,
  ) {
    super();
  }

  /**
   * Validate the confirm request
   */
  protected validate(request: ConfirmBookingRequest): void {
    if (!request.bookingId) {
      throw new ValidationError('Booking ID is required');
    }

    if (!request.userId) {
      throw new ValidationError('User ID is required');
    }
  }

  /**
   * Execute the use case
   */
  async execute(
    request: ConfirmBookingRequest,
  ): Promise<ConfirmBookingResponse> {
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
          'You do not have permission to confirm this booking',
        );
      }

      // Step 4: Validate status transition
      const allowedTransitions = ['DRAFT', 'PENDING'];
      if (!allowedTransitions.includes(booking.status)) {
        throw new BusinessLogicError(
          `Cannot confirm booking with status ${booking.status}. Only DRAFT and PENDING bookings can be confirmed.`,
        );
      }

      // Step 5: Update booking status
      const updated = await this.prisma.booking.update({
        where: { id: request.bookingId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      // Step 6: Publish event
      await this.outboxEventService.createEvent(
        'booking.events',
        `confirm-${request.bookingId}`,
        {
          type: 'booking.confirmed',
          bookingId: request.bookingId,
          userId: request.userId,
          amount: booking.finalAmount.toString(),
          title: booking.title,
          confirmedAt: new Date(),
        },
      );

      // Step 7: Return response
      return {
        id: updated.id,
        status: updated.status,
        confirmedAt: updated.confirmedAt!,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      return this.mapError(error as Error);
    }
  }
}
