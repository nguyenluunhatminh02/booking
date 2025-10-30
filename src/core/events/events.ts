// src/core/events/events.ts

import { DomainEvent } from './event-bus.service';

/**
 * Booking Created Event
 */
export class BookingCreatedEvent implements DomainEvent {
  type = 'booking.created';
  aggregateType = 'Booking';
  timestamp = new Date();
  version = 1;

  constructor(
    public aggregateId: string, // bookingId
    public data: {
      bookingId: string;
      userId: string;
      title: string;
      amount: number;
      startTime: Date;
      endTime: Date;
    },
  ) {}
}

/**
 * Booking Confirmed Event
 */
export class BookingConfirmedEvent implements DomainEvent {
  type = 'booking.confirmed';
  aggregateType = 'Booking';
  timestamp = new Date();
  version = 1;

  constructor(
    public aggregateId: string,
    public data: {
      bookingId: string;
      userId: string;
    },
  ) {}
}

/**
 * Booking Cancelled Event
 */
export class BookingCancelledEvent implements DomainEvent {
  type = 'booking.cancelled';
  aggregateType = 'Booking';
  timestamp = new Date();
  version = 1;

  constructor(
    public aggregateId: string,
    public data: {
      bookingId: string;
      userId: string;
      reason: string;
      refundAmount?: number;
    },
  ) {}
}

/**
 * Payment Created Event
 */
export class PaymentCreatedEvent implements DomainEvent {
  type = 'payment.created';
  aggregateType = 'Payment';
  timestamp = new Date();
  version = 1;

  constructor(
    public aggregateId: string,
    public data: {
      paymentId: string;
      bookingId: string;
      userId: string;
      amount: number;
      provider: string;
    },
  ) {}
}

/**
 * Payment Completed Event
 */
export class PaymentCompletedEvent implements DomainEvent {
  type = 'payment.completed';
  aggregateType = 'Payment';
  timestamp = new Date();
  version = 1;

  constructor(
    public aggregateId: string,
    public data: {
      paymentId: string;
      bookingId: string;
      amount: number;
      chargeId: string;
    },
  ) {}
}

/**
 * User Registered Event
 */
export class UserRegisteredEvent implements DomainEvent {
  type = 'user.registered';
  aggregateType = 'User';
  timestamp = new Date();
  version = 1;

  constructor(
    public aggregateId: string,
    public data: {
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
    },
  ) {}
}
