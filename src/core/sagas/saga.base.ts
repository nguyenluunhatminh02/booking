import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SagaStep, SagaContext, SagaOptions, SagaResult } from './saga.types';

/**
 * Base Saga class for distributed transactions
 * Orchestrates a series of steps with automatic compensation on failure
 */
@Injectable()
export abstract class Saga<C extends SagaContext = SagaContext> {
  protected readonly logger = new Logger(this.constructor.name);
  protected abstract readonly steps: SagaStep<C>[];

  get name(): string {
    return this.constructor.name;
  }

  /**
   * Execute saga with automatic compensation on failure
   */
  async execute(context: C, options: SagaOptions = {}): Promise<SagaResult> {
    const sagaId = options.transactionId || randomUUID();
    const startTime = Date.now();
    const executedSteps: string[] = [];
    const compensationStack: SagaStep<C>[] = [];

    this.logger.log(`[${sagaId}] Starting saga: ${this.name}`, { context });

    try {
      // Execute each step
      for (const step of this.steps) {
        this.logger.debug(`[${sagaId}] Executing step: ${step.name}`);

        try {
          const stepResult = await step.execute(context);

          // Store step result in context for next steps
          (context as any)[step.name] = stepResult;
          executedSteps.push(step.name);

          // Add to compensation stack if has compensate
          if (step.compensate && !step.optional) {
            compensationStack.push(step);
          }

          this.logger.debug(`[${sagaId}] Step completed: ${step.name}`);
        } catch (error) {
          this.logger.error(`[${sagaId}] Step failed: ${step.name}`, error);

          // If optional, continue
          if (step.optional) {
            this.logger.warn(
              `[${sagaId}] Step ${step.name} is optional, continuing...`,
            );
            continue;
          }

          // Otherwise, trigger compensation
          this.logger.warn(
            `[${sagaId}] Triggering compensation for ${executedSteps.length} steps`,
          );

          await this.compensate(sagaId, compensationStack, context);

          const duration = Date.now() - startTime;
          return {
            success: false,
            output: null,
            executedSteps,
            failedStep: step.name,
            error: error instanceof Error ? error : new Error(String(error)),
            compensatedSteps: compensationStack.map((s) => s.name),
            duration,
          };
        }
      }

      const duration = Date.now() - startTime;

      this.logger.log(
        `[${sagaId}] Saga completed successfully in ${duration}ms`,
        { executedSteps },
      );

      return {
        success: true,
        output: context,
        executedSteps,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(`[${sagaId}] Saga failed with error`, error);

      return {
        success: false,
        output: null,
        executedSteps,
        error: error instanceof Error ? error : new Error(String(error)),
        duration,
      };
    }
  }

  /**
   * Execute compensation steps in reverse order
   */
  private async compensate(
    sagaId: string,
    compensationStack: SagaStep<C>[],
    context: C,
  ): Promise<void> {
    this.logger.log(
      `[${sagaId}] Starting compensation for ${compensationStack.length} steps`,
    );

    // Execute in reverse order
    for (let i = compensationStack.length - 1; i >= 0; i--) {
      const step = compensationStack[i];

      try {
        this.logger.debug(`[${sagaId}] Compensating step: ${step.name}`);

        if (step.compensate) {
          await step.compensate(context);
        }

        this.logger.debug(`[${sagaId}] Compensation completed: ${step.name}`);
      } catch (error) {
        this.logger.error(
          `[${sagaId}] Compensation failed for ${step.name}`,
          error,
        );

        // Continue compensation even if one fails
        // This is critical to avoid cascade failures
      }
    }

    this.logger.log(`[${sagaId}] Compensation completed`);
  }
}
