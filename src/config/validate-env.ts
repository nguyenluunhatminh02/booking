import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.string().regex(/^\d+$/).default('3000'),
  PUBLIC_BASE_URL: z.string().url().optional(),

  // DB
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_ACCESS_TTL: z.string().optional(),
  JWT_REFRESH_TTL: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.string().optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
  COOKIE_NAME: z.string().optional(),

  // Storage (S3/R2)
  STORAGE_DRIVER: z.enum(['s3']).default('s3'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  PRESIGN_EXPIRES: z.string().regex(/^\d+$/).optional(),

  // SMTP
  // Email (SendGrid)
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FORCE_SEND: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  APP_URL: z.string().url().optional(),
  MAIL_PREVIEW: z.string().optional(),
  MAIL_TEMPLATES_BASE_URL: z.string().optional(),

  RL_RPM_IP: z.string().optional(),
  RL_RPM_WORKSPACE: z.string().optional(),
  QUOTA_TICKETS_PER_MONTH: z.string().optional(),
  QUOTA_WEBHOOKS_PER_DAY: z.string().optional(),
  QUOTA_UPLOAD_BYTES_PER_MONTH: z.string().optional(),

  WEBHOOK_SIGNATURE_HEADER: z.string().optional(),
  WEBHOOK_HMAC_ALGO: z.enum(['sha256', 'sha512']).optional(),
  WEBHOOK_MAX_ATTEMPTS: z.string().optional(),
  WEBHOOK_INITIAL_DELAY_MS: z.string().optional(),
  WEBHOOK_BACKOFF_FACTOR: z.string().optional(),
  WEBHOOK_MAX_DELAY_MS: z.string().optional(),
  WEBHOOK_CONCURRENCY: z.string().optional(),
  IDEMPOTENCY_TTL_DAYS: z.string().optional(),
  WEBHOOK_DELIVERY_TTL_DAYS: z.string().optional(),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .optional(),
  ENABLE_BACKGROUND_JOBS: z.enum(['true', 'false']).optional(),
  REQUEST_ID_HEADER: z.string().optional(),
  RLS_WORKSPACE_VAR: z.string().optional(),
  RLS_ACTOR_VAR: z.string().optional(),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = schema.safeParse(config);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment variables: ${msg}`);
  }
  return parsed.data;
}
