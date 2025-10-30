import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/prisma/prisma.service';
import { SagaResult, SagaOptions, SagaContext } from './saga.types';
import { Saga } from './saga.base';

/**
 * Saga Orchestrator - Manages saga execution and state
 */
@Injectable()
export class SagaOrchestrator {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(SagaOrchestrator.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Execute a saga and persist its state
   */
  async execute<C extends SagaContext>(
    saga: Saga<C>,
    context: C,
    options: SagaOptions = {},
  ): Promise<SagaResult> {
    const sagaId = options.transactionId;

    this.logger.info(
      { sagaId, sagaName: saga.name },
      'Starting saga execution',
    );

    const startTime = Date.now();

    try {
      const result = await saga.execute(context, options);
      const duration = Date.now() - startTime;

      if (result.success) {
        this.logger.info(
          {
            sagaId,
            sagaName: saga.name,
            duration,
            steps: result.executedSteps,
          },
          'Saga completed successfully',
        );
      } else {
        this.logger.error(
          {
            sagaId,
            sagaName: saga.name,
            duration,
            failedStep: result.failedStep,
            error: result.error?.message,
            compensatedSteps: result.compensatedSteps,
          },
          'Saga failed and was compensated',
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        { sagaId, sagaName: saga.name, duration, error },
        'Saga execution error',
      );

      return {
        success: false,
        output: null,
        executedSteps: [],
        error: error instanceof Error ? error : new Error(String(error)),
        duration,
      };
    }
  }
}
