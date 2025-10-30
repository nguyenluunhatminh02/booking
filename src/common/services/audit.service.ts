import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

/**
 * Audit Service
 * Logs audit events for compliance and troubleshooting
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectPinoLogger(AuditService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Log an audit event
   */
  async logEvent(
    action: string,
    data: {
      userId?: string;
      bookingId?: string;
      resourceType: string;
      resourceId: string;
      changes?: Record<string, any>;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      const auditLog = {
        action,
        timestamp: new Date().toISOString(),
        userId: data.userId,
        bookingId: data.bookingId,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        changes: data.changes || {},
        metadata: data.metadata || {},
      };

      // TODO: Save to audit log database/table
      // await this.prisma.auditLog.create({ data: auditLog });

      this.logger.info(auditLog, `Audit: ${action}`);
    } catch (error) {
      this.logger.error(
        { action, error: (error as Error).message },
        'Failed to log audit event',
      );
      // Don't throw - audit failures shouldn't break main flow
    }
  }

  /**
   * Log booking related audit event
   */
  async logBookingEvent(
    action: 'CREATED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REFUNDED',
    userId: string,
    bookingId: string,
    amount?: string,
  ): Promise<void> {
    await this.logEvent(`BOOKING_${action}`, {
      userId,
      bookingId,
      resourceType: 'BOOKING',
      resourceId: bookingId,
      changes: {
        action,
        amount,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
