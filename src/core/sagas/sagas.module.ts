import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';
import { SagaOrchestrator } from './saga.orchestrator';
import { BookingCancellationSaga } from './booking-cancellation.saga';
import { BookingPaymentSaga } from './booking-payment.saga';

@Module({
  imports: [PrismaModule, OutboxModule],
  providers: [SagaOrchestrator, BookingCancellationSaga, BookingPaymentSaga],
  exports: [SagaOrchestrator, BookingCancellationSaga, BookingPaymentSaga],
})
export class SagasModule {}
