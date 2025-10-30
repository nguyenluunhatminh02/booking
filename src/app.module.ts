import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { appConfig } from './config/app/app.config';
import { validateEnv } from './config/validate-env';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { AclGuard } from './common/guards/acl.guard';
import { RateLimitModule } from './core/rate-limit/rate-limit.module';
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule, ClsService } from 'nestjs-cls';
import { createPinoConfig } from './config/pino-logger.config';
import { SlowRequestInterceptor } from './common/interceptors/slow-request.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FilesModule } from './modules/files/files.module';
import { AdminModule } from './modules/admin/admin.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AclModule } from './modules/acl/acl.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { BookingModule } from './modules/booking/booking.module';
import { QueueModule } from './core/queue/queue.module';
import { TasksModule } from './core/tasks/tasks.module';
import { OutboxProcessorModule } from './modules/outbox/outbox-processor.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/rbac/guards/permissions.guard';
import { RoleGuard } from './modules/rbac/guards/role.guard';
import { RedisModule } from './common/redis.module';
import { PropertyModule } from './modules/property/property.module';
import { ReviewModule } from './modules/review/review.module';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';
import { SecurityEventsModule } from './modules/security-events/security-events.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { MailerModule } from './modules/mailer/mailer.module';
import { SagasModule } from './core/sagas/sagas.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CachingModule } from './common/caching/caching.module';
import { PaymentModule } from './modules/payment/payment.module';

const backgroundJobsEnabled =
  process.env.ENABLE_BACKGROUND_JOBS === 'true' ||
  (!!process.env.REDIS_URL && process.env.ENABLE_BACKGROUND_JOBS !== 'false');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig],
      validate: validateEnv,
    }),
    // Pino Logger - Production Ready
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createPinoConfig,
    }),
    // CLS (Context Local Storage) for request context
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: any) => req.headers['x-request-id'] || req.id,
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const ttlSec = Number(cfg.get('THROTTLE_TTL_SEC') ?? 60);
        const limit = Number(cfg.get('THROTTLE_LIMIT') ?? 120);
        const redis = cfg.get<string>('REDIS_URL'); // ví dụ: redis://127.0.0.1:6379

        return {
          throttlers: [{ ttl: seconds(ttlSec), limit }],
          // Bật Redis khi có URL, còn không thì dùng in-memory (1 instance)
          storage: redis ? new ThrottlerStorageRedisService(redis) : undefined,
        };
      },
    }),
    PrismaModule,
    RedisModule, // Global Redis module
    CachingModule, // Global caching infrastructure
    RateLimitModule,
    SagasModule, // Saga pattern for distributed transactions
    // Background Jobs & Scheduling (enable when Redis/queues are configured)
    ...(backgroundJobsEnabled
      ? [QueueModule, TasksModule, OutboxProcessorModule]
      : []),
    // Feature Modules
    AuthModule,
    UsersModule,
    FilesModule,
    AdminModule,
    RbacModule,
    AclModule,
    OutboxModule,
    BookingModule,
    PropertyModule,
    ReviewModule,
    IdempotencyModule,
    SecurityEventsModule,
    AuditLogModule,
    InvoiceModule,
    MailerModule,
    NotificationsModule,
    PaymentModule, // Payment processing with timeout jobs
  ],
  controllers: [AppController],
  providers: [
    // Global Guards (order matters!)
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard, // 1. Rate limiting first
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // 2. Authentication (can be skipped with @Public())
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard, // 3. Permission-based authorization
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard, // 4. Role-based authorization
    },
    AppService,
    AclGuard, // Register AclGuard as provider for DI
    SlowRequestInterceptor, // Add to providers for DI
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly cls: ClsService) {}

  configure(consumer: MiddlewareConsumer) {
    // Request ID middleware (still needed for backwards compatibility)
    consumer.apply(RequestIdMiddleware).forRoutes('*');

    // CLS Context Middleware - Attach user/workspace context
    consumer
      .apply((req: any, _res: any, next: any) => {
        this.cls.set('requestId', req.id || req.headers['x-request-id']);
        this.cls.set('userId', req.user?.id);
        this.cls.set(
          'workspaceId',
          req.headers['x-workspace-id'] || req.user?.workspaceId,
        );
        this.cls.set('ip', req.ip);
        this.cls.set('method', req.method);
        this.cls.set('url', req.url);
        next();
      })
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
