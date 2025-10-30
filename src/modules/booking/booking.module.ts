import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';
import { SagasModule } from '@/core/sagas/sagas.module';
import { EventsModule } from '@/core/events/events.module';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import {
  CreateBookingUseCase,
  ConfirmBookingUseCase,
  CancelBookingUseCase,
  GetBookingUseCase,
  ListBookingsUseCase,
} from './use-cases';
import {
  BookingCreatedHandler,
  BookingConfirmedHandler,
  BookingCancelledHandler,
  BookingCompletedHandler,
} from './event-handlers';
import {
  EmailService,
  NotificationService,
  AuditService,
  AnalyticsService,
} from '@/common/services';

@Module({
  imports: [PrismaModule, OutboxModule, SagasModule, EventsModule],
  providers: [
    BookingsService,
    CreateBookingUseCase,
    ConfirmBookingUseCase,
    CancelBookingUseCase,
    GetBookingUseCase,
    ListBookingsUseCase,
    // Common Services
    EmailService,
    NotificationService,
    AuditService,
    AnalyticsService,
    // Event handlers
    BookingCreatedHandler,
    BookingConfirmedHandler,
    BookingCancelledHandler,
    BookingCompletedHandler,
  ],
  controllers: [BookingsController],
  exports: [
    BookingsService,
    CreateBookingUseCase,
    ConfirmBookingUseCase,
    CancelBookingUseCase,
    GetBookingUseCase,
    ListBookingsUseCase,
  ],
})
export class BookingModule {}
