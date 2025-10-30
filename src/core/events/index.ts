// src/core/events/index.ts

export {
  EventBusService,
  DomainEvent,
  EventHandler,
} from './event-bus.service';
export { OnEvent, OnEvents, EVENT_HANDLER_METADATA } from './event.decorator';
export * from './events';
export { EventsModule } from './events.module';
