/**
 * Saga Pattern Types and Interfaces
 * Supports distributed transaction coordination with automatic compensation
 */

/**
 * Step execution context - passed through each step
 */
export interface SagaContext {
  [key: string]: any;
}

/**
 * Single step in a saga
 */
export interface SagaStep<T extends SagaContext = SagaContext> {
  name: string;
  execute: (context: T) => Promise<any>;
  compensate?: (context: T) => Promise<void>;
  optional?: boolean; // If true, failure doesn't trigger compensation
}

/**
 * Saga execution options
 */
export interface SagaOptions {
  transactionId?: string; // For correlation/tracing
  timeout?: number; // ms
  maxRetries?: number;
  retryDelay?: number; // ms
}

/**
 * Saga execution result
 */
export interface SagaResult<T = any> {
  success: boolean;
  output: T;
  executedSteps: string[];
  failedStep?: string;
  error?: Error;
  compensatedSteps?: string[];
  duration: number; // ms
}

/**
 * Saga state for persistence
 */
export interface SagaState {
  id: string;
  sagaName: string;
  status:
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'FAILED'
    | 'COMPENSATING'
    | 'COMPENSATED';
  context: SagaContext;
  executedSteps: string[];
  failedStep?: string;
  compensatedSteps?: string[];
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  retries: number;
}
