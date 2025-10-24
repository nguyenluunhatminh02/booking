// src/common/services/redis-logger.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import Redis from 'ioredis';

/**
 * Redis Logger Service
 * Monitors Redis connection and logs events
 */
@Injectable()
export class RedisLoggerService implements OnModuleInit {
  private redis: Redis | null = null;

  constructor(
    @InjectPinoLogger(RedisLoggerService.name)
    private readonly logger: PinoLogger,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('Redis URL not configured, skipping Redis logging');
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          this.logger.warn({ attempt: times, delay }, 'Redis connection retry');
          return delay;
        },
      });

      this.setupEventHandlers();
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize Redis logger');
    }
  }

  private setupEventHandlers() {
    if (!this.redis) return;

    // Connection events
    this.redis.on('connect', () => {
      this.logger.info('Redis client connecting');
    });

    this.redis.on('ready', () => {
      this.logger.info('Redis client ready');
    });

    this.redis.on('error', (error) => {
      this.logger.error(
        {
          error: error.message,
          stack: error.stack,
          code: (error as any).code,
        },
        'Redis client error',
      );
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis client connection closed');
    });

    this.redis.on('reconnecting', (delay) => {
      this.logger.info({ delay }, 'Redis client reconnecting');
    });

    this.redis.on('end', () => {
      this.logger.info('Redis client connection ended');
    });
  }

  /**
   * Log Redis command execution
   */
  logCommand(command: string, args: any[], duration: number) {
    const threshold = Number(process.env.REDIS_SLOW_LOG_THRESHOLD_MS) || 100;

    if (duration > threshold) {
      this.logger.warn(
        {
          command,
          args: args.slice(0, 3), // Log first 3 args only
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
        },
        'Slow Redis command',
      );
    } else {
      this.logger.debug(
        {
          command,
          duration: `${duration}ms`,
        },
        'Redis command executed',
      );
    }
  }

  /**
   * Check Redis health
   */
  async checkHealth(): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const start = Date.now();
      await this.redis.ping();
      const duration = Date.now() - start;

      this.logger.debug(
        { duration: `${duration}ms` },
        'Redis health check passed',
      );
      return true;
    } catch (error) {
      this.logger.error({ error }, 'Redis health check failed');
      return false;
    }
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<any> {
    if (!this.redis) return null;

    try {
      const info = await this.redis.info();
      return this.parseRedisInfo(info);
    } catch (error) {
      this.logger.error({ error }, 'Failed to get Redis info');
      return null;
    }
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};

    lines.forEach((line) => {
      if (line && !line.startsWith('#') && line.includes(':')) {
        const [key, value] = line.split(':');
        result[key.trim()] = value.trim();
      }
    });

    return result;
  }
}
