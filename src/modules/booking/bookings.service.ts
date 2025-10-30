import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxEventService } from '@/modules/outbox/outbox-event.service';
import { SagaOrchestrator, BookingCancellationSaga } from '@/core/sagas';
import { CreateBookingDto, UpdateBookingDto, CancelBookingDto } from './dto';
import { softDeleteAnd, softDelete } from '@/common/database';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private outboxEventService: OutboxEventService,
    private sagaOrchestrator: SagaOrchestrator,
    private bookingCancellationSaga: BookingCancellationSaga,
  ) {}

  /**
   * Tạo booking mới (DRAFT status)
   */
  async create(userId: string, dto: CreateBookingDto) {
    // Validate startTime < endTime
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Calculate duration in minutes
    const duration = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );

    // Calculate final amount
    const amount = new Decimal(dto.amount);
    const discount = dto.discount ? new Decimal(dto.discount) : new Decimal(0);
    const tax = dto.tax ? new Decimal(dto.tax) : new Decimal(0);
    const finalAmount = amount.minus(discount).plus(tax);

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        notes: dto.notes,
        amount,
        currency: dto.currency,
        discount,
        tax,
        finalAmount,
        startTime,
        endTime,
        duration,
        timezone: dto.timezone,
        tags: dto.tags,
        metadata: dto.metadata,
        status: 'DRAFT',
      },
    });

    // Dispatch event
    await this.outboxEventService.createEvent(
      'booking.events',
      `create-${booking.id}`,
      {
        type: 'booking.created',
        bookingId: booking.id,
        userId: booking.userId,
        amount: booking.finalAmount,
      },
    );

    return booking;
  }

  /**
   * Lấy tất cả bookings của user (excludes soft-deleted)
   * OPTIMIZED: Use select to avoid fetching unnecessary fields
   */
  async findByUser(userId: string, status?: string) {
    const where: any = { userId, ...softDeleteAnd() };
    if (status) where.status = status;

    return this.prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      // Select only needed fields for list view
      select: {
        id: true,
        title: true,
        status: true,
        startTime: true,
        endTime: true,
        finalAmount: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Lấy booking theo ID (excludes soft-deleted)
   * OPTIMIZED: Include related user data to prevent N+1 queries
   */
  async findOne(id: string): Promise<any> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Check if booking exists
    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    // Check if soft-deleted (cast to any to bypass type checking since field may not be inferred)
    const deletedAt = (booking as any).deletedAt;
    if (deletedAt !== null && deletedAt !== undefined) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    return booking;
  }

  /**
   * Check quyền truy cập booking
   */
  async checkAccess(bookingId: string, userId: string) {
    const booking = await this.findOne(bookingId);

    // Owner luôn có quyền
    if (booking.userId === userId) {
      return true;
    }

    // Admin có quyền (check qua ACL hoặc RBAC)
    // TODO: Check qua ACL service
    return false;
  }

  /**
   * Cập nhật booking
   */
  async update(id: string, userId: string, dto: UpdateBookingDto) {
    const booking = await this.findOne(id);

    // Check quyền
    this.ensureAccess(booking, userId, 'update');

    // Không cho phép cập nhật khi booking đã confirmed
    if (booking.status !== 'DRAFT' && booking.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot update booking with status ${booking.status}`,
      );
    }

    const updateData: any = {};

    if (dto.title) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.tags) updateData.tags = dto.tags;
    if (dto.metadata) updateData.metadata = dto.metadata;

    if (dto.status) {
      // Validate status transition
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.validateStatusTransition(booking.status, dto.status);
      updateData.status = dto.status;

      // Set timestamps
      if (dto.status === 'CONFIRMED') {
        updateData.confirmedAt = new Date();
      } else if (dto.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (dto.status === 'CANCELLED') {
        updateData.cancelledAt = new Date();
      }
    }

    // Recalculate amount nếu có changes
    if (dto.amount || dto.discount || dto.tax) {
      const amount = dto.amount ? new Decimal(dto.amount) : booking.amount;
      const discount = dto.discount
        ? new Decimal(dto.discount)
        : booking.discount || new Decimal(0);
      const tax = dto.tax
        ? new Decimal(dto.tax)
        : booking.tax || new Decimal(0);

      updateData.finalAmount = amount.minus(discount).plus(tax);
      if (dto.amount) updateData.amount = amount;
      if (dto.discount !== undefined) updateData.discount = discount;
      if (dto.tax !== undefined) updateData.tax = tax;
    }

    return this.prisma.booking.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Xác nhận booking (DRAFT -> PENDING -> CONFIRMED)
   */
  async confirm(id: string, userId: string) {
    const booking = await this.findOne(id);

    this.ensureAccess(booking, userId, 'confirm');

    if (booking.status !== 'DRAFT' && booking.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot confirm booking with status ${booking.status}`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    // Dispatch event
    await this.outboxEventService.createEvent(
      'booking.events',
      `confirm-${id}`,
      {
        type: 'booking.confirmed',
        bookingId: id,
        userId: booking.userId,
        amount: booking.finalAmount,
      },
    );

    return updated;
  }

  /**
   * Hủy booking và hoàn tiền
   * Uses BookingCancellationSaga for distributed transaction with compensation
   */
  async cancel(id: string, userId: string, dto: CancelBookingDto) {
    const booking = await this.findOne(id);

    this.ensureAccess(booking, userId, 'cancel');

    // Chỉ có thể hủy nếu chưa completed hoặc cancelled
    if (
      booking.status === 'COMPLETED' ||
      booking.status === 'CANCELLED' ||
      booking.status === 'REFUNDED'
    ) {
      throw new BadRequestException(
        `Cannot cancel booking with status ${booking.status}`,
      );
    }

    const refundAmount = dto.refundAmount
      ? new Decimal(dto.refundAmount)
      : booking.finalAmount;

    // Execute saga for distributed cancellation
    const sagaResult = await this.sagaOrchestrator.execute(
      this.bookingCancellationSaga,
      {
        bookingId: id,
        userId,
        reason: dto.reason,
        refundAmount,
      },
    );

    if (!sagaResult.success) {
      throw new Error(
        `Booking cancellation failed: ${sagaResult.error?.message}`,
      );
    }

    // Saga handles status update and event publishing
    const updatedBooking = await this.findOne(id);
    return updatedBooking;
  }

  /**
   * Xác nhận hoàn tiền
   */
  async confirmRefund(id: string) {
    const booking = await this.findOne(id);

    // Chỉ admin có thể xác nhận refund
    // TODO: Check qua RBAC
    if (booking.status !== 'REFUND_PENDING') {
      throw new BadRequestException(
        `Cannot refund booking with status ${booking.status}`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    });

    // Dispatch event
    await this.outboxEventService.createEvent(
      'booking.events',
      `refund-${id}`,
      {
        type: 'booking.refunded',
        bookingId: id,
        userId: booking.userId,
        refundAmount: booking.refundAmount?.toString(),
      },
    );

    return updated;
  }

  /**
   * Lấy stats cho user (hoặc admin nếu no userId) - excludes soft-deleted
   */
  async getStats(userId?: string) {
    const where: any = {
      ...(userId && { userId }),
      deletedAt: null,
    };

    const [total, draft, pending, confirmed, completed, cancelled, refunded] =
      await Promise.all([
        this.prisma.booking.count({ where }),
        this.prisma.booking.count({
          where: { ...where, status: 'DRAFT' },
        }),
        this.prisma.booking.count({
          where: { ...where, status: 'PENDING' },
        }),
        this.prisma.booking.count({
          where: { ...where, status: 'CONFIRMED' },
        }),
        this.prisma.booking.count({
          where: { ...where, status: 'COMPLETED' },
        }),
        this.prisma.booking.count({
          where: { ...where, status: 'CANCELLED' },
        }),
        this.prisma.booking.count({
          where: { ...where, status: 'REFUNDED' },
        }),
      ]);

    return {
      total,
      draft,
      pending,
      confirmed,
      completed,
      cancelled,
      refunded,
    };
  }

  /**
   * Xóa booking (chỉ draft) - Soft delete
   * Sets deletedAt timestamp instead of permanent deletion
   * Data is recoverable if needed
   */
  async delete(id: string, userId: string) {
    const booking = await this.findOne(id);

    this.ensureAccess(booking, userId, 'delete');

    if (booking.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot delete booking with status ${booking.status}`,
      );
    }

    // Use soft delete instead of hard delete
    const deleted = await softDelete('booking', id, this.prisma);

    // Publish event for audit logging
    await this.outboxEventService.createEvent(
      'booking.events',
      `delete-${id}`,
      {
        type: 'booking.deleted',
        bookingId: id,
        userId: userId,
        reason: 'User deleted draft booking',
      },
    );

    return deleted;
  }

  // ============= Private Methods =============

  /**
   * Kiểm tra quyền truy cập
   */
  private ensureAccess(booking: any, userId: string, action: string) {
    // Owner có quyền
    if (booking.userId === userId) {
      return;
    }

    // TODO: Check qua ACL service
    throw new ForbiddenException(`Access denied to ${action} booking`);
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(from: string, to: string) {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['PENDING', 'CANCELLED'],
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: ['REFUND_PENDING'],
      CANCELLED: ['REFUND_PENDING'],
      REFUND_PENDING: ['REFUNDED'],
      REFUNDED: [],
    };

    if (!validTransitions[from]?.includes(to)) {
      throw new BadRequestException(
        `Invalid status transition: ${from} -> ${to}`,
      );
    }
  }
}
