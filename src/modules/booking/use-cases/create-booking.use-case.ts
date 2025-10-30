import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxEventService } from '@/modules/outbox/outbox-event.service';
import { UseCase, ValidationError } from './base.use-case';

/**
 * Request object for CreateBookingUseCase
 */
export class CreateBookingRequest {
  userId: string;
  title: string;
  description?: string;
  notes?: string;
  amount: string | number;
  currency: string;
  discount?: string | number;
  tax?: string | number;
  startTime: Date;
  endTime: Date;
  timezone: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Response object for CreateBookingUseCase
 */
export class CreateBookingResponse {
  id: string;
  userId: string;
  title: string;
  finalAmount: Decimal;
  status: string;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
}

/**
 * Create Booking Use Case
 *
 * Business Logic:
 * 1. Validate time range (startTime < endTime)
 * 2. Calculate duration in minutes
 * 3. Calculate final amount (amount - discount + tax)
 * 4. Create booking in DRAFT status
 * 5. Publish booking.created event
 *
 * This separates business logic from the HTTP layer,
 * making it testable and reusable across different interfaces (REST, GraphQL, etc.)
 */
@Injectable()
export class CreateBookingUseCase extends UseCase<
  CreateBookingRequest,
  CreateBookingResponse
> {
  constructor(
    private prisma: PrismaService,
    private outboxEventService: OutboxEventService,
  ) {
    super();
  }

  /**
   * Validate the create booking request
   */
  protected validate(request: CreateBookingRequest): void {
    if (!request.userId) {
      throw new ValidationError('User ID is required');
    }

    if (!request.title || request.title.trim().length === 0) {
      throw new ValidationError('Title is required');
    }

    const startTime = new Date(request.startTime);
    const endTime = new Date(request.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new ValidationError('Invalid date format for startTime or endTime');
    }

    if (startTime >= endTime) {
      throw new ValidationError('Start time must be before end time');
    }

    const amount = new Decimal(request.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new ValidationError('Amount must be greater than 0');
    }

    if (!request.currency) {
      throw new ValidationError('Currency is required');
    }

    if (!request.timezone) {
      throw new ValidationError('Timezone is required');
    }
  }

  /**
   * Execute the use case
   */
  async execute(request: CreateBookingRequest): Promise<CreateBookingResponse> {
    try {
      // Step 1: Validate input
      this.validate(request);

      // Step 2: Calculate derived values
      const startTime = new Date(request.startTime);
      const endTime = new Date(request.endTime);
      const duration = Math.round(
        (endTime.getTime() - startTime.getTime()) / 60000,
      );

      // Step 3: Calculate amounts
      const amount = new Decimal(request.amount);
      const discount = request.discount
        ? new Decimal(request.discount)
        : new Decimal(0);
      const tax = request.tax ? new Decimal(request.tax) : new Decimal(0);
      const finalAmount = amount.minus(discount).plus(tax);

      // Step 4: Create booking
      const booking = await this.prisma.booking.create({
        data: {
          userId: request.userId,
          title: request.title,
          description: request.description,
          notes: request.notes,
          amount,
          currency: request.currency,
          discount,
          tax,
          finalAmount,
          startTime,
          endTime,
          duration,
          timezone: request.timezone,
          tags: request.tags || [],
          metadata: request.metadata || {},
          status: 'DRAFT',
        },
      });

      // Step 5: Publish event for async processing
      await this.outboxEventService.createEvent(
        'booking.events',
        `create-${booking.id}`,
        {
          type: 'booking.created',
          bookingId: booking.id,
          userId: booking.userId,
          amount: booking.finalAmount.toString(),
          title: booking.title,
          startTime: booking.startTime,
        },
      );

      // Step 6: Return response
      return {
        id: booking.id,
        userId: booking.userId,
        title: booking.title,
        finalAmount: booking.finalAmount,
        status: booking.status,
        startTime: booking.startTime,
        endTime: booking.endTime,
        createdAt: booking.createdAt,
      };
    } catch (error) {
      return this.mapError(error as Error);
    }
  }
}
