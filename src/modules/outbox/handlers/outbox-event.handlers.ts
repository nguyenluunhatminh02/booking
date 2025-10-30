import { Injectable, OnModuleInit } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/prisma/prisma.service';
import { OutboxEventService } from '../outbox-event.service';
import {
  EventHandlerRegistry,
  extractEventListeners,
} from './event-listener.decorator';
import { BookingEventHandlers } from './booking.event-handlers';
import { UserEventHandlers } from './user.event-handlers';

/**
 * Central event handler registry and dispatcher
 * Manages consumption of outbox events
 */
@Injectable()
export class OutboxEventHandlers implements OnModuleInit {
  private readonly handlerMap = new Map<string, EventHandlerRegistry[]>();

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxEventService,
    private readonly bookingHandlers: BookingEventHandlers,
    private readonly userHandlers: UserEventHandlers,
    @InjectPinoLogger(OutboxEventHandlers.name)
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit() {
    this.registerHandlers();
  }

  /**
   * Register all event handlers
   */
  private registerHandlers(): void {
    this.logger.info('Registering event handlers...');

    const services = [this.bookingHandlers, this.userHandlers];

    for (const service of services) {
      const listeners = extractEventListeners(
        service.constructor as any,
        service as any,
      );

      for (const listener of listeners) {
        if (!this.handlerMap.has(listener.eventType)) {
          this.handlerMap.set(listener.eventType, []);
        }
        this.handlerMap.get(listener.eventType)!.push(listener);
        this.logger.debug(
          `Registered handler: ${listener.eventType} → ${listener.service}`,
        );
      }
    }

    this.logger.info(
      `Registered ${this.handlerMap.size} event types with ${Array.from(
        this.handlerMap.values(),
      ).reduce((sum, handlers) => sum + handlers.length, 0)} handlers`,
    );
  }

  /**
   * Handle a single event
   */
  async handleEvent(eventId: string): Promise<void> {
    const event = await this.prisma.outboxEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      this.logger.warn(`Event not found: ${eventId}`);
      return;
    }

    const eventType = (event.payload as any).type as string;
    const handlers = this.handlerMap.get(eventType);

    if (!handlers || handlers.length === 0) {
      this.logger.warn(`No handlers registered for event type: ${eventType}`);
      // Mark as sent even if no handler - event is processed
      await this.outboxService.updateEventStatus(eventId, 'SENT');
      return;
    }

    const startTime = Date.now();
    const results: { handler: string; success: boolean; error?: string }[] = [];

    for (const handlerRegistry of handlers) {
      try {
        this.logger.debug(
          `Executing handler: ${handlerRegistry.service} for ${eventType}`,
        );

        await handlerRegistry.handler(event.payload);

        results.push({
          handler: handlerRegistry.service,
          success: true,
        });

        this.logger.debug(`Handler completed: ${handlerRegistry.service}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        results.push({
          handler: handlerRegistry.service,
          success: false,
          error: errorMsg,
        });

        this.logger.error(`Handler failed: ${handlerRegistry.service}`, error);
      }
    }

    const duration = Date.now() - startTime;
    const allSuccess = results.every((r) => r.success);

    if (allSuccess) {
      await this.outboxService.updateEventStatus(eventId, 'SENT');
      this.logger.info(
        `Event processed successfully: ${eventType} (${duration}ms)`,
        { results },
      );
    } else {
      const failedHandlers = results.filter((r) => !r.success);
      const error = `Handler failures: ${failedHandlers.map((h) => `${h.handler}: ${h.error}`).join('; ')}`;

      await this.outboxService.updateEventStatus(eventId, 'FAILED', error);
      this.logger.error(`Event processing failed: ${eventType}`, {
        results,
        duration,
      });
    }
  }

  /**
   * Process multiple events
   */
  async handleEvents(eventIds: string[]): Promise<void> {
    this.logger.info(`Processing ${eventIds.length} events...`);

    for (const eventId of eventIds) {
      try {
        await this.handleEvent(eventId);
      } catch (error) {
        this.logger.error(`Failed to process event: ${eventId}`, error);
      }
    }
  }

  /**
   * Get all registered event types
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.handlerMap.keys());
  }

  /**
   * Get handlers for an event type
   */
  getHandlers(eventType: string): EventHandlerRegistry[] {
    return this.handlerMap.get(eventType) || [];
  }
}
