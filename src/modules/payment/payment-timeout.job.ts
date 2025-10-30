import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { OutboxProducer } from '../outbox/outbox.producer';

/**
 * Background job to handle payment timeout and cleanup
 * Runs every 5 minutes to expire pending payments
 */
@Injectable()
export class PaymentTimeoutJob {
  private readonly logger = new Logger(PaymentTimeoutJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxProducer,
  ) {}

  /**
   * Expire pending payments older than 30 minutes
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expirePendingPayments() {
    try {
      const timeoutMinutes = parseInt(
        process.env.PAYMENT_TIMEOUT_MINUTES || '30',
        10,
      );
      const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

      this.logger.log(
        `Checking for pending payments older than ${timeoutMinutes} minutes`,
      );

      const expiredPayments = await this.prisma.payment.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: cutoffTime,
          },
        },
        include: {
          booking: true,
        },
      });

      if (expiredPayments.length === 0) {
        this.logger.log('No expired pending payments found');
        return;
      }

      this.logger.log(
        `Found ${expiredPayments.length} expired pending payments`,
      );

      // Process each expired payment
      for (const payment of expiredPayments) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // Update payment status to EXPIRED
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: 'EXPIRED' },
            });

            // Update booking status to CANCELLED
            if (
              payment.booking &&
              (payment.booking.status === 'PENDING' ||
                payment.booking.status === 'DRAFT')
            ) {
              await tx.propertyBooking.update({
                where: { id: payment.bookingId },
                data: { status: 'CANCELLED' },
              });

              // Emit booking cancelled event
              await this.outbox.emitInTx(
                tx,
                'booking.cancelled',
                payment.bookingId,
                {
                  bookingId: payment.bookingId,
                  userId: payment.booking.customerId,
                  reason: 'Payment timeout',
                  cancelledBy: 'SYSTEM',
                },
              );
            }

            // Emit payment expired event
            await this.outbox.emitInTx(tx, 'payment.expired', payment.id, {
              paymentId: payment.id,
              bookingId: payment.bookingId,
              provider: payment.provider,
              amount: payment.amount,
            });
          });

          this.logger.log(
            `Expired payment ${payment.id} and cancelled booking ${payment.bookingId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to expire payment ${payment.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      this.logger.log(
        `Successfully processed ${expiredPayments.length} expired payments`,
      );
    } catch (error) {
      this.logger.error(
        'Error in expirePendingPayments job',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Cleanup old processed webhooks (older than 90 days)
   * Runs daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldWebhooks() {
    try {
      const retentionDays = parseInt(
        process.env.WEBHOOK_RETENTION_DAYS || '90',
        10,
      );
      const cutoffDate = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000,
      );

      this.logger.log(
        `Cleaning up processed webhooks older than ${retentionDays} days`,
      );

      const result = await this.prisma.processedWebhook.deleteMany({
        where: {
          processedAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(`Deleted ${result.count} old processed webhook records`);
    } catch (error) {
      this.logger.error(
        'Error in cleanupOldWebhooks job',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Monitor and alert on stuck refunds
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async monitorStuckRefunds() {
    try {
      const timeoutHours = parseInt(
        process.env.REFUND_TIMEOUT_HOURS || '24',
        10,
      );
      const cutoffTime = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

      const stuckRefunds = await this.prisma.refund.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: cutoffTime,
          },
        },
        include: {
          payment: true,
        },
      });

      if (stuckRefunds.length > 0) {
        this.logger.warn(
          `Found ${stuckRefunds.length} stuck refunds (pending > ${timeoutHours}h)`,
        );

        // In production, send alert to monitoring system
        for (const refund of stuckRefunds) {
          this.logger.warn(
            `Stuck refund: ${refund.id} for payment ${refund.paymentId} (${refund.payment.provider})`,
          );

          // Emit alert event for monitoring
          await this.outbox.emit('refund.stuck', refund.id, {
            refundId: refund.id,
            paymentId: refund.paymentId,
            provider: refund.payment.provider,
            amount: refund.amount,
            pendingSince: refund.createdAt,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        'Error in monitorStuckRefunds job',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Generate payment analytics metrics
   * Runs every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async generatePaymentMetrics() {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Count payments by status
      const metrics = await this.prisma.payment.groupBy({
        by: ['status', 'provider'],
        where: {
          createdAt: {
            gte: last24h,
          },
        },
        _count: true,
        _sum: {
          amount: true,
        },
      });

      this.logger.log('Payment metrics (last 24h):');
      for (const metric of metrics) {
        this.logger.log(
          `  ${metric.provider} ${metric.status}: ${metric._count} payments, ` +
            `total ${metric._sum.amount || 0}`,
        );
      }

      // Calculate success rate
      const totalPayments = metrics.reduce((sum, m) => sum + m._count, 0);
      const succeededPayments =
        metrics.find((m) => m.status === 'SUCCEEDED')?._count || 0;
      const successRate =
        totalPayments > 0
          ? ((succeededPayments / totalPayments) * 100).toFixed(2)
          : '0';

      this.logger.log(
        `Success rate: ${successRate}% (${succeededPayments}/${totalPayments})`,
      );

      // Emit metrics event for monitoring system
      await this.outbox.emit('payment.metrics', `metrics_${Date.now()}`, {
        period: 'last_24h',
        metrics,
        successRate: parseFloat(successRate),
        totalPayments,
        succeededPayments,
      });
    } catch (error) {
      this.logger.error(
        'Error in generatePaymentMetrics job',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
