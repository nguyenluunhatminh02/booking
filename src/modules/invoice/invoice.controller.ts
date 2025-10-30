import { Controller, Get, Post, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiOperationDecorator,
  ApiResponseType,
} from '../../common/decorators';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get(':bookingId/pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperationDecorator({
    summary: 'Download invoice PDF',
    description: 'Generate and download invoice as PDF',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async downloadPdf(
    @Param('bookingId') bookingId: string,
    @Res() res: Response,
  ) {
    const { stream, filename } =
      await this.invoiceService.generatePdfStream(bookingId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    stream.pipe(res);
  }

  @Post(':bookingId/email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperationDecorator({
    summary: 'Email invoice to customer',
    description: 'Send invoice to customer email address',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async emailInvoice(@Param('bookingId') bookingId: string) {
    await this.invoiceService.emailInvoice(bookingId);
    return { ok: true, message: 'Invoice email sent' };
  }
}
