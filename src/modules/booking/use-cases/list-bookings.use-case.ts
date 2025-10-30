import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UseCase, ValidationError } from './base.use-case';

/**
 * Request for listing bookings (with pagination and filtering)
 */
export class ListBookingsRequest {
  userId: string;
  status?: string; // Filter by status
  skip?: number; // Pagination
  take?: number; // Limit
  sortBy?: 'createdAt' | 'startTime' | 'finalAmount'; // Sort field
  sortOrder?: 'asc' | 'desc'; // Sort direction
}

/**
 * Single booking item in list
 */
export class BookingListItem {
  id: string;
  title: string;
  status: string;
  finalAmount: string;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
}

/**
 * Response with paginated bookings
 */
export class ListBookingsResponse {
  data: BookingListItem[];
  total: number;
  skip: number;
  take: number;
}

/**
 * List Bookings Use Case (Query)
 *
 * Business Logic:
 * 1. Validate pagination parameters
 * 2. Filter bookings by user and optional status
 * 3. Sort by specified field
 * 4. Return paginated results with total count
 *
 * Features:
 * - Pagination support (skip/take)
 * - Filtering by status
 * - Sorting by multiple fields
 * - Total count for UI pagination
 */
@Injectable()
export class ListBookingsUseCase extends UseCase<
  ListBookingsRequest,
  ListBookingsResponse
> {
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;
  private readonly VALID_STATUSES = [
    'DRAFT',
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED',
  ];

  constructor(private prisma: PrismaService) {
    super();
  }

  /**
   * Validate the list request
   */
  protected validate(request: ListBookingsRequest): void {
    if (!request.userId) {
      throw new ValidationError('User ID is required');
    }

    if (request.status && !this.VALID_STATUSES.includes(request.status)) {
      throw new ValidationError(
        `Invalid status. Must be one of: ${this.VALID_STATUSES.join(', ')}`,
      );
    }

    if (request.skip !== undefined && request.skip < 0) {
      throw new ValidationError('Skip must be >= 0');
    }

    if (request.take !== undefined && request.take < 1) {
      throw new ValidationError('Take must be >= 1');
    }

    if (request.take && request.take > this.MAX_LIMIT) {
      throw new ValidationError(
        `Take must be <= ${this.MAX_LIMIT}. For large datasets, use pagination.`,
      );
    }

    if (
      request.sortBy &&
      !['createdAt', 'startTime', 'finalAmount'].includes(request.sortBy)
    ) {
      throw new ValidationError(
        'Invalid sortBy. Must be one of: createdAt, startTime, finalAmount',
      );
    }

    if (request.sortOrder && !['asc', 'desc'].includes(request.sortOrder)) {
      throw new ValidationError('Invalid sortOrder. Must be asc or desc');
    }
  }

  /**
   * Execute the use case
   */
  async execute(request: ListBookingsRequest): Promise<ListBookingsResponse> {
    try {
      // Step 1: Validate input
      this.validate(request);

      // Step 2: Set pagination defaults
      const skip = request.skip || 0;
      const take = Math.min(request.take || this.DEFAULT_LIMIT, this.MAX_LIMIT);

      // Step 3: Build filter
      const where: any = { userId: request.userId };
      if (request.status) {
        where.status = request.status;
      }

      // Step 4: Build order by
      const orderBy: any = {};
      if (request.sortBy) {
        orderBy[request.sortBy] = request.sortOrder || 'desc';
      } else {
        // Default: newest first
        orderBy.createdAt = 'desc';
      }

      // Step 5: Fetch bookings in parallel with count
      const [bookings, total] = await Promise.all([
        this.prisma.booking.findMany({
          where,
          orderBy,
          skip,
          take,
          select: {
            id: true,
            title: true,
            status: true,
            finalAmount: true,
            startTime: true,
            endTime: true,
            createdAt: true,
          },
        }),
        this.prisma.booking.count({ where }),
      ]);

      // Step 6: Map to response items
      const data: BookingListItem[] = bookings.map((booking) => ({
        id: booking.id,
        title: booking.title,
        status: booking.status,
        finalAmount: booking.finalAmount.toString(),
        startTime: booking.startTime,
        endTime: booking.endTime,
        createdAt: booking.createdAt,
      }));

      // Step 7: Return response
      return {
        data,
        total,
        skip,
        take,
      };
    } catch (error) {
      return this.mapError(error as Error);
    }
  }
}
