import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  PaymentProviderAdapter,
  CreateIntentRequest,
  CreateIntentResponse,
  CreateRefundRequest,
  CreateRefundResponse,
  WebhookEvent,
} from './provider.adapter';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MockProviderAdapter extends PaymentProviderAdapter {
  private readonly logger = new Logger(MockProviderAdapter.name);

  // eslint-disable-next-line @typescript-eslint/require-await
  async createIntent(req: CreateIntentRequest): Promise<CreateIntentResponse> {
    this.logger.log(
      `[MOCK] Creating payment intent for ${req.amount} ${req.currency}`,
    );

    const intentId = `mock_${uuidv4()}`;
    const clientSecret = `mock_secret_${uuidv4()}`;

    return {
      intentId,
      clientSecret,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async createRefund(req: CreateRefundRequest): Promise<CreateRefundResponse> {
    this.logger.log(
      `[MOCK] Refunding ${req.amount} for charge ${req.chargeId}`,
    );

    return {
      refundId: `mock_refund_${uuidv4()}`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyAndNormalizeWebhook(
    headers: Record<string, any>,
    rawBody: string,
  ): Promise<WebhookEvent> {
    try {
      const payload = JSON.parse(rawBody);
      return {
        type: payload.type || 'payment_succeeded',
        eventId: payload.id || `mock_evt_${uuidv4()}`,
        intentId: payload.data?.object?.id,
        chargeId: payload.data?.object?.charges?.data?.[0]?.id,
        provider: 'MOCK',
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
    return {
      type: 'payment_succeeded',
      eventId: `mock_evt_${uuidv4()}`,
      provider: 'MOCK',
      raw: JSON.stringify(queryParams),
    };
  }
}
