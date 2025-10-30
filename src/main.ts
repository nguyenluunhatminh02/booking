import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { SlowRequestInterceptor } from './common/interceptors/slow-request.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import { makeZodValidationPipe } from './common/pipes/zod-validation.pipe';

async function bootstrap() {
  // Surface any uncaught exceptions / unhandled rejections to the console
  process.on('uncaughtException', (err) => {
    // ensure these are visible in terminal output during debugging

    console.error('Uncaught Exception:', err && (err.stack || err));
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });

  try {
    console.log('🚀 Starting NestJS application...');

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      bufferLogs: true,
    });

    // Use Pino Logger
    app.useLogger(app.get(Logger));

    // Trust proxy for rate limiting and IP detection
    app.set('trust proxy', 1);

    app.use(helmet());
    app.use(
      compression({
        level: 6, // Mức nén trung bình
        threshold: 1024, // Nén nếu phản hồi lớn hơn 1KB
        filter: (req, res) => {
          // Nén tất cả trừ khi header `x-no-compression` tồn tại
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        },
        chunkSize: 8192, // Kích thước chunk là 8KB
        zlib: {
          windowBits: 15, // Kích thước cửa sổ nén
          memLevel: 8, // Sử dụng bộ nhớ tối ưu
        },
      }),
    );

    // Enable graceful shutdown
    app.enableShutdownHooks();

    // Global pipes
    app.useGlobalPipes(makeZodValidationPipe());
    // Global interceptors
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TimeoutInterceptor(30000), // 30 seconds timeout
      new TransformInterceptor(app.get(Reflector)),
      app.get(SlowRequestInterceptor), // Slow request monitoring
    );

    // Global unified exception filter
    app.useGlobalFilters(new GlobalExceptionFilter());

    // CORS configuration
    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Request-Id',
      ],
    });

    // Swagger documentation
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('NestJS API')
        .setDescription('API Documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('auth', 'Authentication endpoints')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
    }

    const port = process.env.PORT ?? 3000;
    await app.listen(port);

    console.log(`🚀 Application is running on: http://localhost:${port}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    }
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
