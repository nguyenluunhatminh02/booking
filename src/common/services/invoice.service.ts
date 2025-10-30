import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Invoice Service
 * Handles invoice generation and management
 */
@Injectable()
export class InvoiceService {
  constructor(
    @InjectPinoLogger(InvoiceService.name)
    private readonly logger: PinoLogger,
    private prisma: PrismaService,
  ) {}

  /**
   * Generate invoice for completed booking
   */
  async generateInvoice(
    bookingId: string,
    userId: string,
    data: {
      amount: string;
      currency: string;
      title: string;
      description?: string;
      tax?: string;
      discount?: string;
    },
  ): Promise<string> {
    try {
      this.logger.info({ bookingId, userId }, 'Generating invoice');

      const invoiceId = `INV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // TODO: Create Invoice record in database
      // const invoice = await this.prisma.invoice.create({
      //   data: {
      //     id: invoiceId,
      //     bookingId,
      //     userId,
      //     amount: data.amount,
      //     currency: data.currency,
      //     title: data.title,
      //     description: data.description,
      //     tax: data.tax || '0',
      //     discount: data.discount || '0',
      //     status: 'GENERATED',
      //     generatedAt: new Date(),
      //   },
      // });

      this.logger.info(
        { bookingId, invoiceId },
        'Invoice generated successfully',
      );

      return invoiceId;
    } catch (error) {
      this.logger.error(
        { bookingId, error: (error as Error).message },
        'Failed to generate invoice',
      );
      throw error;
    }
  }

  /**
   * Send invoice to user email
   */
  async sendInvoiceEmail(
    email: string,
    invoiceId: string,
    data: {
      bookingId: string;
      amount: string;
      title: string;
    },
  ): Promise<void> {
    try {
      this.logger.info({ invoiceId, email }, 'Sending invoice email');

      // TODO: Generate PDF and send via email
      // const pdfBuffer = await this.generatePDF(invoiceId);
      // await this.emailService.sendInvoice(email, { invoiceId, pdfBuffer, ...data });

      this.logger.info({ invoiceId }, 'Invoice email sent');
    } catch (error) {
      this.logger.error(
        { invoiceId, error: (error as Error).message },
        'Failed to send invoice email',
      );
      throw error;
    }
  }
}
