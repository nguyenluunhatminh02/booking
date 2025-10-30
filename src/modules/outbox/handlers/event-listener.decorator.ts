/**
 * Event Handler Decorator and Registry
 * Enables declarative event handling with @EventListener()
 */

import { SetMetadata, Type } from '@nestjs/common';

export const EVENT_LISTENER_METADATA = 'event:listener';
export const EVENT_PATTERN_METADATA = 'event:pattern';

/**
 * Decorator to mark a method as event listener
 * @param eventType - The event type to listen for (e.g., 'booking.created')
 *
 * Usage:
 * @EventListener('booking.created')
 * async handleBookingCreated(payload: any) { ... }
 */
export function EventListener(eventType: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(EVENT_PATTERN_METADATA, eventType)(
      target,
      propertyKey,
      descriptor,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    SetMetadata(EVENT_LISTENER_METADATA, true)(target, propertyKey, descriptor);
    return descriptor;
  };
}

/**
 * Registry for event handlers
 */
export interface EventHandlerRegistry {
  eventType: string;
  handler: (payload: any) => Promise<void>;
  service: string;
}

/**
 * Extract event listeners from a service class
 */
export function extractEventListeners(
  serviceClass: Type<any>,
  serviceInstance: any,
): EventHandlerRegistry[] {
  const listeners: EventHandlerRegistry[] = [];

  const prototype = serviceClass.prototype;

  for (const propertyName of Object.getOwnPropertyNames(prototype)) {
    const method = prototype[propertyName];
    if (typeof method !== 'function') continue;

    const eventType = Reflect.getMetadata(
      EVENT_PATTERN_METADATA,
      prototype,
      propertyName,
    );
    const isListener = Reflect.getMetadata(
      EVENT_LISTENER_METADATA,
      prototype,
      propertyName,
    );

    if (eventType && isListener) {
      listeners.push({
        eventType,
        handler: (payload: any) => method.call(serviceInstance, payload),
        service: serviceClass.name,
      });
    }
  }

  return listeners;
}
