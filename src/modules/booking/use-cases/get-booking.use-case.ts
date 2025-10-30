import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UseCase, ValidationError, BusinessLogicError } from './base.use-case';

/**
 * Request for getting a single booking
 */
export class GetBookingRequest {
  bookingId: string;
  userId: string; // For authorization check
}

/**
 * Response with booking details
 */
export class GetBookingResponse {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: string;
  amount: string;
  finalAmount: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  timezone: string;
  tags: string[];
  metadata: Record<string, any>;
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get Booking Use Case (Query)
 *
 * Business Logic:
 * 1. Verify booking exists
 * 2. Authorize access (owner or admin)
 * 3. Return booking details
 *
 * This is a read-only use case that enforces access control
 */
@Injectable()
export class GetBookingUseCase extends UseCase<
  GetBookingRequest,
  GetBookingResponse
> {
  constructor(private prisma: PrismaService) {
    super();
  }

  /**
   * Validate the get request
   */
  protected validate(request: GetBookingRequest): void {
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
  async execute(request: GetBookingRequest): Promise<GetBookingResponse> {
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

      // Step 3: Verify access (owner only - can be extended for admins)
      if (booking.userId !== request.userId) {
        throw new BusinessLogicError('You do not have access to this booking');
      }

      // Step 4: Return response
      return {
        id: booking.id,
        userId: booking.userId,
        title: booking.title,
        description: booking.description || undefined,
        status: booking.status,
        amount: booking.amount.toString(),
        finalAmount: booking.finalAmount.toString(),
        startTime: booking.startTime,
        endTime: booking.endTime,
        duration: booking.duration || 0,
        timezone: booking.timezone || 'Asia/Ho_Chi_Minh',
        tags: booking.tags || [],
        metadata: (booking.metadata as Record<string, any>) || {},
        confirmedAt: booking.confirmedAt || undefined,
        completedAt: booking.completedAt || undefined,
        cancelledAt: booking.cancelledAt || undefined,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      };
    } catch (error) {
      return this.mapError(error as Error);
    }
  }
}
