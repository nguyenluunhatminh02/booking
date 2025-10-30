/**
 * Abstract base class for all Use Cases
 * Implements core SOLID principles: Single Responsibility, Dependency Inversion
 *
 * Benefits:
 * - Separation of business logic from infrastructure (Prisma, services)
 * - Easier testing (mock dependencies)
 * - Clear contract for all use cases
 * - Transaction handling and error management
 *
 * Pattern: Command/Query Object pattern
 */

export abstract class UseCase<TRequest, TResponse> {
  /**
   * Execute the use case with given request
   * @param request - The input data/command
   * @returns The result of the use case execution
   */
  abstract execute(request: TRequest): Promise<TResponse>;

  /**
   * Validate the request before execution
   * Override in subclasses for specific validation
   * @param _request - The input to validate (prefixed with _ to indicate intentionally unused)
   * @throws BadRequestException if validation fails
   */
  protected validate(_request: TRequest): void {
    // Override in subclasses for specific validation logic
  }

  /**
   * Common error mapping for all use cases
   * Converts business exceptions to HTTP responses
   */
  protected mapError(error: Error): never {
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof BusinessLogicError) {
      throw error;
    }
    throw new Error(`Unexpected error in use case: ${error.message}`);
  }
}

/**
 * Domain-specific error for validation issues
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Domain-specific error for business logic violations
 */
export class BusinessLogicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}
