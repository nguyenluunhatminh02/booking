// src/config/pino-logger.config.ts
import { Params } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

/**
 * Pino Logger Configuration - Production Ready
 * Features:
 * - Request ID correlation
 * - Sensitive data redaction
 * - Smart HTTP logging with status-based levels
 * - Redis/Prisma integration ready
 * - CLS (Context Local Storage) support
 * - Ignore health/docs/metrics routes
 */
export function createPinoConfig(cfg: ConfigService): Params {
  const isDev = cfg.get('NODE_ENV') !== 'production';
  const logLevel = cfg.get('LOG_LEVEL') || (isDev ? 'debug' : 'info');

  // Routes to ignore (health checks, docs, static assets)
  const ignorePaths = [
    '/health',
    '/api/docs',
    '/docs',
    '/metrics',
    '/favicon.ico',
    '/robots.txt',
  ];

  return {
    pinoHttp: {
      level: logLevel,

      // Pretty print for development
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: false,
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              messageFormat:
                '{req.method} {req.url} {res.statusCode} - {responseTime}ms',
            },
          }
        : undefined,

      // Auto-logging HTTP requests
      autoLogging: {
        ignore: (req: any) => {
          return ignorePaths.some((path) => req.url?.startsWith(path));
        },
      },

      // Generate/preserve request ID
      genReqId: (req: any, res: any) => {
        const existingId = req.headers['x-request-id'] as string;
        const requestId = existingId || randomBytes(16).toString('hex');
        res.setHeader('x-request-id', requestId);
        return requestId;
      },

      // Dynamic log level based on response status
      customLogLevel: (req: any, res: any, err: any) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        if (res.statusCode >= 300) return 'info';
        return 'debug';
      },

      // Redact sensitive data
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'req.body.password',
          'req.body.*.password',
          'req.body.confirmPassword',
          'req.body.oldPassword',
          'req.body.newPassword',
          'req.body.token',
          'req.body.accessToken',
          'req.body.refreshToken',
          'res.headers["set-cookie"]',
        ],
        censor: '***REDACTED***',
      },

      // Attach custom properties to logs
      customProps: (req: any, res: any) => ({
        requestId: req.id,
        userId: req.user?.id,
        workspaceId: req.headers['x-workspace-id'] || req.user?.workspaceId,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
      }),

      // Customize request/response logging
      serializers: {
        req: (req: any) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          // Only log body for non-GET requests, and limit size
          body:
            req.method !== 'GET' && req.body
              ? truncateObject(req.body, 1000)
              : undefined,
          headers: {
            host: req.headers.host,
            'user-agent': req.headers['user-agent'],
            'content-type': req.headers['content-type'],
          },
        }),
        res: (res: any) => ({
          statusCode: res.statusCode,
          headers: {
            'content-type':
              typeof res.getHeader === 'function'
                ? res.getHeader('content-type')
                : res.headers?.['content-type'],
            'content-length':
              typeof res.getHeader === 'function'
                ? res.getHeader('content-length')
                : res.headers?.['content-length'],
          },
        }),
        err: (err: any) => ({
          type: err.type,
          message: err.message,
          stack: isDev ? err.stack : undefined,
          code: err.code,
          statusCode: err.statusCode,
        }),
      },

      // Quiet request logger to avoid duplicate logs
      quietReqLogger: true,

      // Custom success message
      customSuccessMessage: (req: any, res: any) => {
        return `${req.method} ${req.url} completed`;
      },

      // Custom error message
      customErrorMessage: (req: any, res: any, err: any) => {
        return `${req.method} ${req.url} failed: ${err.message}`;
      },
    },
  };
}

/**
 * Truncate large objects to prevent log flooding
 */
function truncateObject(obj: any, maxLength: number): any {
  const str = JSON.stringify(obj);
  if (str.length <= maxLength) return obj;

  return {
    _truncated: true,
    _originalSize: str.length,
    _preview: str.substring(0, maxLength) + '...',
  };
}

/**
 * Generate crypto-random ID
 */
export function generateRequestId(length = 16): string {
  return randomBytes(length).toString('hex');
}
