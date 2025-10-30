/**
 * Use Cases Module
 *
 * This module exports all use cases for the booking feature.
 * Use cases encapsulate business logic and are independent of the HTTP layer.
 *
 * Benefits:
 * - Single Responsibility: Each use case handles one business operation
 * - Testability: Easy to test without mocking HTTP dependencies
 * - Reusability: Can be used from REST, GraphQL, CLI, etc.
 * - Clarity: Business logic is explicit and easy to understand
 * - Maintainability: Changes to business rules are centralized
 *
 * Pattern: Command/Query Object Pattern (CQS)
 */

export { UseCase, ValidationError, BusinessLogicError } from './base.use-case';

export {
  CreateBookingUseCase,
  CreateBookingRequest,
  CreateBookingResponse,
} from './create-booking.use-case';

export {
  ConfirmBookingUseCase,
  ConfirmBookingRequest,
  ConfirmBookingResponse,
} from './confirm-booking.use-case';

export {
  CancelBookingUseCase,
  CancelBookingRequest,
  CancelBookingResponse,
} from './cancel-booking.use-case';

export {
  GetBookingUseCase,
  GetBookingRequest,
  GetBookingResponse,
} from './get-booking.use-case';

export {
  ListBookingsUseCase,
  ListBookingsRequest,
  ListBookingsResponse,
  BookingListItem,
} from './list-bookings.use-case';
