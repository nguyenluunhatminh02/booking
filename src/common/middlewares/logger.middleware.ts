// common/middlewares/logger.middleware.ts
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to log all HTTP requests with detailed information
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, url, headers, query, body, ip } = req;

    // Sensitive data to exclude from logs
    const sanitizedBody = this.sanitizeData(body);
    const requestId = headers['x-request-id'] || '-';

    res.on('finish', () => {
      const responseTime = Date.now() - start;
      const { statusCode } = res;

      const logData = {
        requestId,
        method,
        url,
        statusCode,
        responseTime: `${responseTime}ms`,
        ip,
        userAgent: headers['user-agent'],
        query: Object.keys(query).length > 0 ? query : undefined,
        body: Object.keys(sanitizedBody).length > 0 ? sanitizedBody : undefined,
      };

      const message = `${method} ${url} ${statusCode} ${responseTime}ms`;

      if (statusCode >= 500) {
        this.logger.error(message, JSON.stringify(logData));
      } else if (statusCode >= 400) {
        this.logger.warn(message, JSON.stringify(logData));
      } else {
        this.logger.log(message);
      }
    });

    next();
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
    ];

    const sanitized = { ...data };

    Object.keys(sanitized).forEach((key) => {
      if (
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });

    return sanitized;
  }
}
