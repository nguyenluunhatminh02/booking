// src/prisma/prisma.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

// LẤY TYPE OPTIONS TỪ $transaction, KHÔNG PHỤ THUỘC VERSION
type TxOptions = Parameters<PrismaClient['$transaction']>[1];

// Extension: slow query log bằng $extends (không dùng $use)
const slowQueryExt = (logger: PinoLogger, thresholdMs: number) =>
  Prisma.defineExtension({
    name: 'slowQueryLog',
    query: {
      async $allOperations({ model, operation, args, query }) {
        const t0 = performance.now();
        const res = await query(args);
        const dt = performance.now() - t0;
        if (dt >= thresholdMs) {
          logger.warn(
            { model, operation, durationMs: Math.round(dt) },
            'Prisma slow query',
          );
        }
        return res;
      },
    },
  });

type PrismaWithOnAll = PrismaClient & {
  $on(event: 'query', cb: (e: Prisma.QueryEvent) => void): void;
  $on(event: 'warn' | 'info' | 'error', cb: (e: Prisma.LogEvent) => void): void;
};

function mapPrismaError(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    switch (e.code) {
      case 'P2002':
        throw new ConflictException('Unique constraint violated');
      case 'P2025':
        throw new NotFoundException('Record not found');
      case 'P2003':
        throw new BadRequestException('Foreign key constraint failed');
      default:
        throw new BadRequestException(`Database error ${e.code}`);
    }
  }
  throw e;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly slowMs: number;
  private readonly maxParamLen: number;

  constructor(
    @InjectPinoLogger(PrismaService.name) private readonly logger: PinoLogger,
    private readonly config: ConfigService,
  ) {
    const env = (config.get<string>('NODE_ENV') ?? 'development').toLowerCase();
    const isProd = env === 'production';

    const enableQueryLog =
      !isProd &&
      (config.get<string>('PRISMA_LOG_QUERIES') === 'true' ||
        config.get<string>('PRISMA_LOG_LEVEL') === 'debug');

    // Log levels
    const log: Prisma.LogDefinition[] = [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ];
    if (!isProd) log.push({ emit: 'event', level: 'info' });
    if (enableQueryLog) log.push({ emit: 'event', level: 'query' });

    const datasourceUrl = config.get<string>('DATABASE_URL');
    const datasources = datasourceUrl
      ? { db: { url: datasourceUrl } }
      : undefined;

    super({ log, datasources, errorFormat: isProd ? 'colorless' : 'pretty' });

    // Extend: slow query (thay cho “middleware” cũ)
    this.$extends(
      slowQueryExt(
        this.logger,
        Number(config.get('PRISMA_SLOW_QUERY_MS') ?? 1000),
      ),
    );

    this.slowMs = Number(config.get('PRISMA_SLOW_QUERY_MS') ?? 1000);
    this.maxParamLen = Number(config.get('PRISMA_MAX_PARAM_LEN') ?? 2000);

    this.setupEventListeners(enableQueryLog);
  }

  async onModuleInit() {
    this.logger.info('Prisma connecting…');
    await this.$connect();
    this.logger.info('Prisma connected');
  }

  async onModuleDestroy() {
    this.logger.info('Prisma disconnecting…');
    await this.$disconnect();
    this.logger.info('Prisma disconnected');
  }

  /**
   * Unit of Work helper: gom transaction + map lỗi Prisma -> HTTP
   * Dùng: return this.prisma.uow(tx => tx.user.create(...))
   */
  async uow<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    opts?: TxOptions,
  ): Promise<T> {
    try {
      return await this.$transaction(async (tx) => fn(tx), opts);
    } catch (e) {
      mapPrismaError(e);
    }
  }

  private setupEventListeners(enableQueryLog: boolean) {
    const pc = this as unknown as PrismaWithOnAll;

    if (enableQueryLog) {
      pc.$on('query', (e) => {
        const payload = {
          query: e.query,
          params: this.truncate(e.params),
          durationMs: e.duration,
          target: e.target,
        };
        if (e.duration >= this.slowMs)
          this.logger.warn(payload, 'Prisma slow query');
        else this.logger.debug(payload, 'Prisma query');
      });
    }

    pc.$on('warn', (e) => {
      this.logger.warn({ message: e.message, target: e.target }, 'Prisma warn');
    });

    pc.$on('error', (e) => {
      this.logger.error(
        { message: e.message, target: e.target },
        'Prisma error',
      );
    });

    pc.$on('info', (e) => {
      this.logger.info({ message: e.message, target: e.target }, 'Prisma info');
    });
  }

  private truncate(s?: string) {
    if (!s) return s;
    return s.length > this.maxParamLen
      ? s.slice(0, this.maxParamLen) + '…(truncated)'
      : s;
  }
}
