import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentService } from './payment.service';
import { PaymentTimeoutJob } from './payment-timeout.job';
import { MockProviderAdapter } from './providers/mock.adapter';
import { StripeLikeHmacAdapter } from './providers/stripelike.adapter';
import { VnpayAdapter } from './providers/vnpay.adapter';
import { PrismaModule } from 'src/prisma/prisma.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable cron jobs
    PrismaModule,
    IdempotencyModule,
    OutboxModule,
  ],
  providers: [
    PaymentService,
    PaymentTimeoutJob, // Background jobs for payment timeout, cleanup, monitoring
    MockProviderAdapter,
    StripeLikeHmacAdapter,
    VnpayAdapter,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
