import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  PaymentProviderAdapter,
  CreateIntentRequest,
  CreateIntentResponse,
  CreateRefundRequest,
  CreateRefundResponse,
  WebhookEvent,
} from './provider.adapter';
import * as crypto from 'node:crypto';

@Injectable()
export class StripeLikeHmacAdapter extends PaymentProviderAdapter {
  private readonly logger = new Logger(StripeLikeHmacAdapter.name);
  private readonly webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  // eslint-disable-next-line @typescript-eslint/require-await
  async createIntent(req: CreateIntentRequest): Promise<CreateIntentResponse> {
    this.logger.log(
      `[STRIPE] Creating payment intent for ${req.amount} ${req.currency}`,
    );

    // In production, call Stripe API
    // For now, return mock response
    return {
      intentId: `pi_${this.randomString(24)}`,
      clientSecret: `pi_${this.randomString(24)}_secret_${this.randomString(34)}`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async createRefund(req: CreateRefundRequest): Promise<CreateRefundResponse> {
    this.logger.log(
      `[STRIPE] Refunding ${req.amount} for charge ${req.chargeId}`,
    );

    return {
      refundId: `re_${this.randomString(24)}`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyAndNormalizeWebhook(
    headers: Record<string, any>,
    rawBody: string,
  ): Promise<WebhookEvent> {
    const signature = headers['stripe-signature'];
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Verify HMAC signature - CRITICAL SECURITY
    if (this.webhookSecret) {
      const hash = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');

      // Stripe signature format: t=timestamp,v1=hash
      if (!signature.includes(`v1=${hash}`)) {
        this.logger.error('Invalid webhook signature - rejecting request');
        throw new BadRequestException('Invalid signature');
      }
    } else {
      this.logger.warn('No webhook secret configured - signature not verified');
    }

    try {
      const event = JSON.parse(rawBody);
      return {
        type: this.mapEventType(event.type || ''),
        eventId: event.id,
        intentId: event.data?.object?.id,
        chargeId: event.data?.object?.charges?.data?.[0]?.id,
        provider: 'STRIPE',
        raw: rawBody,
      };
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyAndNormalizeIpn(
    queryParams: Record<string, any>,
  ): Promise<WebhookEvent> {
    // Stripe doesn't use IPN, but for compatibility
    return {
      type: 'payment_succeeded',
      eventId: queryParams.id || `evt_${Date.now()}`,
      intentId: queryParams.intentId,
      chargeId: queryParams.chargeId,
      provider: 'STRIPE',
      raw: JSON.stringify(queryParams),
    };
  }

  private mapEventType(
    stripeType: string,
  ):
    | 'payment_succeeded'
    | 'payment_failed'
    | 'refund_succeeded'
    | 'refund_failed' {
    if (stripeType.includes('charge.succeeded')) return 'payment_succeeded';
    if (stripeType.includes('charge.failed')) return 'payment_failed';
    if (stripeType.includes('charge.refunded')) return 'refund_succeeded';
    return 'payment_failed';
  }

  private randomString(length: number): string {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
  }
}
