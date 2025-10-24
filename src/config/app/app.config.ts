import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const port = parseInt(process.env.PORT ?? '3000', 10);
  return {
    nodeEnv,
    isDev: nodeEnv !== 'production',
    isProd: nodeEnv === 'production',
    port,
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`,
    requestIdHeader: process.env.REQUEST_ID_HEADER ?? 'x-request-id',
    logLevel: process.env.LOG_LEVEL ?? 'info',
  } as const;
});

export type AppConfig = ReturnType<typeof appConfig>;
