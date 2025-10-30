// src/core/events/event-bus.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

/**
 * Domain event interface
 */
export interface DomainEvent {
  type: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: Date;
  version: number;
  data: Record<string, any>;
}

/**
 * Event handler type
 */
export type EventHandler = (event: DomainEvent) => Promise<void> | void;

/**
 * Simple event bus for publishing and handling domain events
 * Complements the Outbox pattern for reliability
 */
@Injectable()
export class EventBusService {
  private handlers: Map<string, EventHandler[]> = new Map();
  private logger = new Logger(EventBusService.name);

  constructor(
    @InjectPinoLogger(EventBusService.name)
    private readonly pino: PinoLogger,
  ) {}

  /**
   * Subscribe to event type
   */
  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    this.pino.info({ eventType }, 'Event handler subscribed');
  }

  /**
   * Unsubscribe from event type
   */
  unsubscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) return;

    const handlers = this.handlers.get(eventType)!;
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.pino.info({ eventType }, 'Event handler unsubscribed');
    }
  }

  /**
   * Publish event and immediately invoke handlers
   */
  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];

    if (handlers.length === 0) {
      this.pino.warn(
        { eventType: event.type, aggregateId: event.aggregateId },
        'No handlers for event type',
      );
      return;
    }

    const startTime = Date.now();
    const results = await Promise.allSettled(
      handlers.map((handler) => handler(event)),
    );

    const duration = Date.now() - startTime;
    const failed = results.filter((r) => r.status === 'rejected');

    if (failed.length > 0) {
      this.pino.error(
        {
          eventType: event.type,
          totalHandlers: handlers.length,
          failedHandlers: failed.length,
          duration,
        },
        'Some event handlers failed',
      );
    } else {
      this.pino.info(
        {
          eventType: event.type,
          handlersCount: handlers.length,
          duration,
        },
        'Event published and handled',
      );
    }
  }

  /**
   * Publish multiple events
   */
  async publishMany(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map((e) => this.publish(e)));
  }

  /**
   * Get list of subscribed events
   */
  getSubscribedEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler count for event type
   */
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length ?? 0;
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clearAllHandlers(): void {
    this.handlers.clear();
    this.pino.warn('All event handlers cleared');
  }

  /**
   * Clear handlers for specific event type
   */
  clearHandlers(eventType: string): void {
    this.handlers.delete(eventType);
    this.pino.warn({ eventType }, 'Event handlers cleared');
  }
}
