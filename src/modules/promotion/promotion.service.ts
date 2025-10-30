import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RedemptionStatus, Prisma } from '@prisma/client';
import { differenceInCalendarDays, isAfter, isBefore } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';
import { OutboxProducer } from '../outbox/outbox.producer';

type Tx = Prisma.TransactionClient;
type PromotionType = 'FIXED' | 'PERCENT';

export interface CreatePromotionDto {
  code: string;
  type: PromotionType;
  value: number;
  validFrom?: string | null;
  validTo?: string | null;
  minNights?: number | null;
  minTotal?: number | null;
  usageLimit?: number | null;
  isActive?: boolean | null;
}

export interface UpdatePromotionDto extends Partial<CreatePromotionDto> {}

@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(
    private prisma: PrismaService,
    private outbox: OutboxProducer,
  ) {}

  // =============== Admin CRUD ===============
  async create(dto: CreatePromotionDto) {
    if (dto.type === 'PERCENT' && (dto.value < 1 || dto.value > 100)) {
      throw new BadRequestException('Percentage value must be 1-100');
    }

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date();
    const validTo = dto.validTo ? new Date(dto.validTo) : new Date();

    return this.prisma.promotion.create({
      data: {
        code: dto.code,
        type: dto.type,
        value: dto.value,
        validFrom,
        validTo,
        minNights: dto.minNights ?? null,
        minTotal: dto.minTotal ?? null,
        usageLimit: dto.usageLimit ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePromotionDto) {
    if (
      dto.type === 'PERCENT' &&
      dto.value != null &&
      (dto.value < 1 || dto.value > 100)
    ) {
      throw new BadRequestException('Percentage value must be 1-100');
    }

    const updateData: any = { ...dto };
    if ('validFrom' in dto)
      updateData.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if ('validTo' in dto)
      updateData.validTo = dto.validTo ? new Date(dto.validTo) : null;

    return this.prisma.promotion.update({
      where: { id },
      data: updateData,
    });
  }

  async findAll() {
    return this.prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.promotion.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Promotion not found');
    return p;
  }

  async byCode(code: string) {
    return this.prisma.promotion.findUnique({ where: { code } });
  }

  // =============== Preview (no side effects) ===============
  async preview(input: { bookingId: string; code: string }) {
    const { bookingId, code } = input;

    const [b, p] = await Promise.all([
      this.prisma.propertyBooking.findUnique({ where: { id: bookingId } }),
      this.prisma.promotion.findUnique({ where: { code } }),
    ]);

    if (!b) throw new NotFoundException('Booking not found');
    if (!p || !p.isActive) throw new BadRequestException('Invalid code');

    const now = new Date();
    if (p.validFrom && isBefore(now, p.validFrom))
      throw new BadRequestException('Code not yet active');
    if (p.validTo && isAfter(now, p.validTo))
      throw new BadRequestException('Code expired');

    const nights = Math.max(1, differenceInCalendarDays(b.checkOut, b.checkIn));
    if (p.minNights && nights < p.minNights)
      throw new BadRequestException('Minimum nights not met');
    if (p.minTotal && b.totalPrice < p.minTotal)
      throw new BadRequestException('Minimum total not met');

    let discount =
      p.type === 'PERCENT'
        ? Math.floor((b.totalPrice * p.value) / 100)
        : p.value;
    if (discount > b.totalPrice) discount = b.totalPrice;

    return { discount, finalPrice: b.totalPrice - discount, nights };
  }

  // =============== Apply / Confirm / Release ===============

  async applyOnHold(input: {
    bookingId: string;
    userId: string;
    code: string;
  }) {
    const { bookingId, userId, code } = input;

    return this.prisma.$transaction(async (tx) => {
      await (tx as any)
        .$queryRaw`SELECT id FROM "Promotion" WHERE code = ${code} FOR UPDATE`;

      const booking = await tx.propertyBooking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          customerId: true,
          checkIn: true,
          checkOut: true,
          totalPrice: true,
          promoCode: true,
          status: true,
        },
      });

      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.customerId !== userId)
        throw new BadRequestException('Not your booking');
      if (!['HOLD', 'REVIEW'].includes(booking.status as any))
        throw new BadRequestException('Booking not in HOLD/REVIEW');
      if (booking.promoCode)
        throw new BadRequestException('Promo already applied');

      const p = await tx.promotion.findUnique({ where: { code } });
      if (!p || !p.isActive) throw new BadRequestException('Invalid code');

      const now = new Date();
      if (p.validFrom && isBefore(now, p.validFrom))
        throw new BadRequestException('Code not yet active');
      if (p.validTo && isAfter(now, p.validTo))
        throw new BadRequestException('Code expired');

      const nights = Math.max(
        1,
        differenceInCalendarDays(booking.checkOut, booking.checkIn),
      );
      if (p.minNights && nights < p.minNights)
        throw new BadRequestException('Minimum nights not met');
      if (p.minTotal && booking.totalPrice < p.minTotal)
        throw new BadRequestException('Minimum total not met');

      let discount =
        p.type === 'PERCENT'
          ? Math.floor((booking.totalPrice * p.value) / 100)
          : p.value;
      if (discount > booking.totalPrice) discount = booking.totalPrice;

      const existed = await tx.promotionRedemption.findUnique({
        where: { bookingId },
      });
      if (existed) throw new BadRequestException('Booking already has promo');

      await tx.promotionRedemption.create({
        data: {
          promotionId: p.id,
          bookingId,
          userId,
          code: p.code,
          amount: discount,
          status: RedemptionStatus.RESERVED,
        },
      });

      await tx.propertyBooking.update({
        where: { id: bookingId },
        data: {
          promoCode: p.code,
          discountAmount: discount,
          appliedPromotionId: p.id,
        },
      });

      await this.outbox.emitInTx(
        tx,
        'promotion.reserved',
        `promotion.reserved:${bookingId}`,
        {
          bookingId,
          code: p.code,
          promotionId: p.id,
          amount: discount,
        },
      );

      return { discount, finalPrice: booking.totalPrice - discount, nights };
    });
  }

  async confirmOnPaid(bookingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const red = await tx.promotionRedemption.findUnique({
        where: { bookingId },
        include: { promotion: true },
      });

      if (!red || red.status !== RedemptionStatus.RESERVED) {
        return { skipped: true };
      }

      const promo = await tx.promotion.findUnique({
        where: { id: red.promotionId },
      });

      if (!promo) {
        throw new NotFoundException('Promotion not found');
      }

      await (tx as any)
        .$queryRaw`SELECT id FROM "Promotion" WHERE id = ${red.promotionId} FOR UPDATE`;

      if (promo.usageLimit != null) {
        const ok = await tx.promotion.updateMany({
          where: {
            id: red.promotionId,
            usedCount: { lt: promo.usageLimit },
          },
          data: { usedCount: { increment: 1 } },
        });

        if (ok.count !== 1) {
          await tx.promotionRedemption.update({
            where: { bookingId },
            data: { status: RedemptionStatus.RELEASED },
          });

          await this.outbox.emitInTx(
            tx,
            'promotion.released',
            `promotion.released:${bookingId}`,
            {
              bookingId,
              code: red.promotion.code,
              cause: 'EXHAUSTED',
            },
          );

          return { status: 'RELEASED', reason: 'EXHAUSTED' };
        }
      } else {
        await tx.promotion.update({
          where: { id: red.promotion.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.promotionRedemption.update({
        where: { bookingId },
        data: { status: RedemptionStatus.APPLIED },
      });

      await this.outbox.emitInTx(
        tx,
        'promotion.applied',
        `promotion.applied:${bookingId}`,
        { bookingId, code: red.promotion.code, amount: red.amount },
      );

      return { status: 'APPLIED' };
    });
  }

  async releaseOnCancelOrExpire(
    bookingId: string,
    decreaseUsage = false,
    cause?:
      | 'CANCELLED'
      | 'EXPIRED'
      | 'REFUNDED'
      | 'AUTO_DECLINED'
      | 'REVIEW_DECLINED',
  ) {
    return this.prisma.$transaction(async (tx) => {
      const red = await tx.promotionRedemption.findUnique({
        where: { bookingId },
      });

      if (!red || red.status === RedemptionStatus.RELEASED) {
        return { released: false };
      }

      const shouldDecrease = decreaseUsage || cause === 'REFUNDED';

      await tx.promotionRedemption.update({
        where: { bookingId },
        data: { status: RedemptionStatus.RELEASED },
      });

      if (shouldDecrease && red.status === RedemptionStatus.APPLIED) {
        await tx.promotion.updateMany({
          where: { id: red.promotionId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }

      await tx.propertyBooking.update({
        where: { id: bookingId },
        data: { promoCode: null, discountAmount: 0, appliedPromotionId: null },
      });

      await this.outbox.emitInTx(
        tx,
        'promotion.released',
        `promotion.released:${bookingId}`,
        {
          bookingId,
          code: red.code,
          cause: cause ?? 'CANCELLED',
          decreasedUsage:
            shouldDecrease && red.status === RedemptionStatus.APPLIED,
        },
      );

      return {
        released: true,
        decreasedUsage:
          shouldDecrease && red.status === RedemptionStatus.APPLIED,
        cause: cause ?? null,
      };
    });
  }
}
