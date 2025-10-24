// src/common/decorators/log-execution.decorator.ts
import { PinoLogger } from 'nestjs-pino';

/**
 * Log Execution Time Decorator
 * Automatically logs method execution time
 *
 * @param threshold - Log only if execution time exceeds this (ms)
 * @param level - Log level (debug, info, warn, error)
 *
 * @example
 * class MyService {
 *   @LogExecution(100, 'warn')
 *   async slowMethod() { ... }
 * }
 */
export function LogExecution(
  threshold = 0,
  level: 'debug' | 'info' | 'warn' | 'error' = 'debug',
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      const logger = getPinoLogger(this, className);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;

        if (duration > threshold) {
          logger[level](
            {
              class: className,
              method: propertyKey,
              duration: `${duration}ms`,
              threshold: threshold > 0 ? `${threshold}ms` : undefined,
            },
            `${className}.${propertyKey} executed`,
          );
        }

        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.error(
          {
            class: className,
            method: propertyKey,
            duration: `${duration}ms`,
            error: error.message,
            stack: error.stack,
          },
          `${className}.${propertyKey} failed`,
        );
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Get or create Pino logger for the instance
 */
function getPinoLogger(instance: any, className: string): PinoLogger {
  if (!instance.__pinoLogger) {
    // Try to get injected logger
    const loggerProp = Object.keys(instance).find(
      (key) => key.includes('logger') || key.includes('Logger'),
    );

    if (loggerProp && instance[loggerProp]) {
      instance.__pinoLogger = instance[loggerProp];
    } else {
      // Fallback: create basic logger
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pino = require('pino');
      instance.__pinoLogger = pino({ name: className });
    }
  }

  return instance.__pinoLogger;
}
