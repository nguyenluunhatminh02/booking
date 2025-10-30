/**
 * Booking Event Handlers
 *
 * These handlers subscribe to booking domain events and execute business side effects
 * Pattern: Observer/Pub-Sub for decoupling event producers from consumers
 *
 * Benefits:
 * - Loose coupling between booking service and side effects (email, notifications, etc.)
 * - Easy to add new handlers without modifying booking service
 * - Can be processed asynchronously
 * - Recoverable via Outbox pattern
 * - Testable in isolation
 */

export { BookingCreatedHandler } from './booking-created.handler';
export { BookingConfirmedHandler } from './booking-confirmed.handler';
export { BookingCancelledHandler } from './booking-cancelled.handler';
export { BookingCompletedHandler } from './booking-completed.handler';
