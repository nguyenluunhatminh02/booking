// src/core/events/event.decorator.ts

import { SetMetadata } from '@nestjs/common';

/**
 * Event handler metadata
 */
export const EVENT_HANDLER_METADATA = 'event_handler';

export interface EventHandlerOptions {
  eventType: string; // e.g., 'booking.created'
  priority?: number; // Higher priority runs first (0-100)
  async?: boolean; // Whether to handle asynchronously
}

/**
 * Decorator for event handler methods
 * @example
 * @OnEvent('booking.created')
 * async handleBookingCreated(event: BookingCreatedEvent) {
 *   // Handle event
 * }
 */
export function OnEvent(
  eventType: string,
  options?: { priority?: number; async?: boolean },
) {
  return SetMetadata(EVENT_HANDLER_METADATA, {
    eventType,
    priority: options?.priority ?? 50,
    async: options?.async ?? true,
  } as EventHandlerOptions);
}

/**
 * Decorator for multiple event handlers
 * @example
 * @OnEvents(['booking.created', 'booking.updated'])
 * async handleBookingChanged(event: BookingEvent) {}
 */
export function OnEvents(
  eventTypes: string[],
  options?: { priority?: number; async?: boolean },
) {
  return SetMetadata(
    EVENT_HANDLER_METADATA,
    eventTypes.map((type) => ({
      eventType: type,
      priority: options?.priority ?? 50,
      async: options?.async ?? true,
    })),
  );
}
