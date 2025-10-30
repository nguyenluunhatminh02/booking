import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

/**
 * Analytics Service
 * Tracks metrics and analytics events
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectPinoLogger(AnalyticsService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Record a booking event metric
   */
  async recordBookingMetric(
    event: 'CREATED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REFUNDED',
    data: {
      bookingId: string;
      userId?: string;
      amount?: string;
      currency?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      const metric = {
        event: `booking.${event.toLowerCase()}`,
        timestamp: new Date().toISOString(),
        bookingId: data.bookingId,
        userId: data.userId,
        amount: data.amount,
        currency: data.currency || 'VND',
        ...data.metadata,
      };

      // TODO: Send to analytics service (Mixpanel, Amplitude, Google Analytics, etc.)
      // await this.analyticsProvider.track(metric);

      this.logger.debug(metric, `Analytics: ${event}`);
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message },
        'Failed to record analytics',
      );
      // Don't throw - analytics failures shouldn't break main flow
    }
  }

  /**
   * Record revenue metric
   */
  async recordRevenue(
    bookingId: string,
    userId: string,
    amount: string,
    currency: string = 'VND',
  ): Promise<void> {
    await this.recordBookingMetric('COMPLETED', {
      bookingId,
      userId,
      amount,
      currency,
      metadata: {
        metricType: 'REVENUE',
      },
    });
  }

  /**
   * Record refund metric
   */
  async recordRefund(
    bookingId: string,
    userId: string,
    refundAmount: string,
    currency: string = 'VND',
  ): Promise<void> {
    await this.recordBookingMetric('REFUNDED', {
      bookingId,
      userId,
      amount: refundAmount,
      currency,
      metadata: {
        metricType: 'REFUND',
      },
    });
  }
}
