import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  PaymentProviderAdapter,
  CreateIntentRequest,
  CreateIntentResponse,
  CreateRefundRequest,
  CreateRefundResponse,
  WebhookEvent,
} from './provider.adapter';

@Injectable()
export class VnpayAdapter extends PaymentProviderAdapter {
  private readonly logger = new Logger(VnpayAdapter.name);
  private readonly tmnCode = process.env.VNPAY_TMN_CODE || '';
  private readonly hashSecret = process.env.VNPAY_HASH_SECRET || '';
  private readonly returnUrl =
    process.env.VNPAY_RETURN_URL || 'http://localhost:3000/payment/callback';

  // eslint-disable-next-line @typescript-eslint/require-await
  async createIntent(req: CreateIntentRequest): Promise<CreateIntentResponse> {
    this.logger.log(
      `[VNPAY] Creating payment redirect for ${req.amount} ${req.currency}`,
    );

    // Build VNPay redirect URL
    const params = new URLSearchParams();
    params.append('vnp_Version', '2.1.0');
    params.append('vnp_Command', 'pay');
    params.append('vnp_TmnCode', this.tmnCode);
    params.append('vnp_Amount', String(Math.round(req.amount * 100)));
    params.append('vnp_CurrCode', 'VND');
    params.append('vnp_TxnRef', `${Date.now()}`);
    params.append(
      'vnp_OrderInfo',
      (req.metadata?.orderInfo as string) || 'Payment',
    );
    params.append('vnp_ReturnUrl', req.returnUrl || this.returnUrl);
    params.append('vnp_CreateDate', this.formatDate(new Date()));
    params.append('vnp_Locale', 'vn');

    const baseUrl =
      process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paygate';
    const redirectUrl = `${baseUrl}?${params.toString()}`;

    return {
      intentId: params.get('vnp_TxnRef') || '',
      redirectUrl,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async createRefund(req: CreateRefundRequest): Promise<CreateRefundResponse> {
    this.logger.log(`[VNPAY] Refund requested for ${req.amount}`);
    throw new BadRequestException(
      'VNPay refund not supported via this adapter',
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyAndNormalizeWebhook(
    _headers: Record<string, any>,
    _rawBody: string,
  ): Promise<WebhookEvent> {
    throw new BadRequestException('VNPay uses IPN, not webhook');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyAndNormalizeIpn(
    queryParams: Record<string, any>,
  ): Promise<WebhookEvent> {
    try {
      const vnpayHash = queryParams.vnp_SecureHash;
      const responseCode = queryParams.vnp_ResponseCode;
      const txnRef = queryParams.vnp_TxnRef;
      const amount = queryParams.vnp_Amount;

      // Verify HMAC signature - CRITICAL SECURITY
      if (this.hashSecret && vnpayHash) {
        const signData = this.buildSignData(queryParams);
        const expectedHash = this.createHmacSHA512(signData, this.hashSecret);

        if (vnpayHash !== expectedHash) {
          this.logger.error('Invalid VNPay signature - rejecting IPN');
          throw new BadRequestException('Invalid VNPay signature');
        }
      } else {
        this.logger.warn(
          'No hash secret or signature - VNPay IPN not verified',
        );
      }

      const type =
        responseCode === '00' ? 'payment_succeeded' : 'payment_failed';

      return {
        type,
        eventId: `vnpay_${txnRef}`,
        intentId: txnRef,
        chargeId: txnRef,
        provider: 'VNPAY',
        raw: JSON.stringify(queryParams),
        metadata: { amount },
      };
    } catch (err) {
      this.logger.error('Invalid IPN data', err);
      throw new BadRequestException('Invalid IPN data');
    }
  }

  private buildSignData(params: Record<string, any>): string {
    // Remove vnp_SecureHash from params
    const { vnp_SecureHash: _, ...signParams } = params;

    // Sort keys alphabetically
    const sortedKeys = Object.keys(signParams).sort();

    // Build query string
    return sortedKeys.map((key) => `${key}=${signParams[key]}`).join('&');
  }

  private createHmacSHA512(data: string, secret: string): string {
    return require('node:crypto')
      .createHmac('sha512', secret)
      .update(data)
      .digest('hex');
  }

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
  }
}
