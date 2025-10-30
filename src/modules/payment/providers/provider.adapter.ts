export interface CreateIntentRequest {
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
}

export interface CreateIntentResponse {
  intentId: string;
  clientSecret?: string;
  redirectUrl?: string;
}

export interface CreateRefundRequest {
  chargeId: string;
  amount: number;
}

export interface CreateRefundResponse {
  refundId: string;
}

export interface WebhookEvent {
  type:
    | 'payment_succeeded'
    | 'payment_failed'
    | 'refund_succeeded'
    | 'refund_failed';
  eventId: string;
  paymentIdHint?: string;
  intentId?: string;
  chargeId?: string;
  provider: string;
  raw: string;
  metadata?: Record<string, any>;
}

export abstract class PaymentProviderAdapter {
  abstract createIntent(
    req: CreateIntentRequest,
  ): Promise<CreateIntentResponse>;
  abstract createRefund(
    req: CreateRefundRequest,
  ): Promise<CreateRefundResponse>;
  abstract verifyAndNormalizeWebhook(
    headers: Record<string, any>,
    rawBody: string,
  ): Promise<WebhookEvent>;
  abstract verifyAndNormalizeIpn?(
    queryParams: Record<string, any>,
  ): Promise<WebhookEvent>;
}
