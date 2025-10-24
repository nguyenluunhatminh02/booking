import {
  INestApplication,
  CanActivate,
  ExecutionContext,
  NestInterceptor,
  CallHandler,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';

import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import * as presigner from '@aws-sdk/s3-request-presigner';
import { Observable } from 'rxjs';
import { Readable } from 'stream';
import { FilesController } from '@/modules/files/files.controller';
import { FilesService } from '@/modules/files/files.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtAuthGuard } from '@/common';
import { IdempotencyInterceptor } from '@/common/interceptors/idempotency.interceptor';

const s3Mock = mockClient(S3Client);

// ---- Simple mock buffer to detect image/jpeg ----
function jpegHeaderBuffer(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
}

// Guards/Interceptors
class AllowAuthGuard implements CanActivate {
  canActivate(_c: ExecutionContext): boolean {
    return true;
  }
}
class NoopIdem implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle();
  }
}

// Prisma in-memory
type FileRow = {
  id: string;
  bucket: string;
  key: string;
  mime: string;
  size?: bigint | null;
  status: 'UPLOADING' | 'READY' | 'FAILED';
  thumbKey?: string | null;
  width?: number | null;
  height?: number | null;
  createdAt: Date;
  updatedAt: Date;
  declaredMime?: string | null;
  sniffedMime?: string | null;
  maxBytes?: bigint | null;
  etag?: string | null;
  completedAt?: Date | null;
  attachments?: { id: string }[];
};
class PrismaServiceMock {
  private files: Map<string, FileRow> = new Map();
  fileObject = {
    create: async ({ data }: { data: Partial<FileRow> }) => {
      const now = new Date();
      const row: FileRow = {
        id: data.id as string,
        bucket: data.bucket as string,
        key: data.key as string,
        mime: data.mime as string,
        size: data.size ?? null,
        status: typeof data.status === 'string' ? data.status : 'UPLOADING',
        thumbKey: data.thumbKey ?? null,
        width: (data as any).width ?? null,
        height: (data as any).height ?? null,
        createdAt: now,
        updatedAt: now,
        declaredMime: (data as any).declaredMime ?? null,
        sniffedMime: (data as any).sniffedMime ?? null,
        maxBytes: (data as any).maxBytes ?? null,
        etag: (data as any).etag ?? null,
        completedAt: (data as any).completedAt ?? null,
        attachments: [],
      };
      this.files.set(row.id, row);
      return { ...row };
    },
    findUnique: async (args: any) => {
      const id = args?.where?.id;
      const row = this.files.get(id);
      if (!row) return null;
      if (args?.include?.attachments)
        return { ...row, attachments: row.attachments ?? [] };
      return { ...row };
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FileRow>;
    }) => {
      const row = this.files.get(where.id);
      if (!row) throw new Error('Not found');
      const updated: FileRow = { ...row, ...data, updatedAt: new Date() };
      this.files.set(where.id, updated);
      return { ...updated };
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const row = this.files.get(where.id);
      if (!row) throw new Error('Not found');
      this.files.delete(where.id);
      return { ...row };
    },
    _attach: (id: string) => {
      const row = this.files.get(id);
      if (row) row.attachments?.push({ id: 'att-1' });
    },
  };
}

// Config & Logger mocks
class ConfigServiceMock {
  private map = new Map<string, string>([
    ['R2_BUCKET', 'test-bucket'],
    ['FILES_CDN_BASE_URL', 'https://cdn.example.com'],
    ['R2_S3_ENDPOINT', 'https://accountid.r2.cloudflarestorage.com'],
    ['R2_ACCESS_KEY_ID', 'AKIA_TEST'],
    ['R2_SECRET_ACCESS_KEY', 'SECRET_TEST'],
    ['R2_REGION', 'auto'],
  ]);
  get<T = any>(k: string): T | undefined {
    return this.map.get(k) as unknown as T;
  }
}
class LoggerMock {
  info() {}
  warn() {}
  error() {}
}

// Mock sharp for thumbnail
jest.mock('sharp', () => {
  const mocked = () => ({
    rotate: () => mocked(),
    metadata: async () => ({ width: 100, height: 80 }),
    resize: () => ({
      jpeg: () => ({ toBuffer: async () => Buffer.from([1, 2, 3]) }),
    }),
  });
  mocked.default = mocked;
  return mocked;
});

// Presigner spy
jest
  .spyOn(presigner, 'getSignedUrl')
  .mockImplementation(async (_c, cmd: any) => {
    if (cmd instanceof GetObjectCommand) return 'https://signed-get-url';
    if (cmd instanceof PutObjectCommand) return 'https://signed-put-url';
    return 'https://signed-url';
  });

describe('FilesModule E2E', () => {
  let app: INestApplication;
  let prisma: PrismaServiceMock;

  beforeAll(async () => {
    s3Mock.reset();
    s3Mock
      .on(HeadObjectCommand)
      .resolves({ ContentLength: 1024, ETag: '"etag123"' });
    s3Mock
      .on(GetObjectCommand)
      .callsFake(() => ({ Body: Readable.from(jpegHeaderBuffer()) }) as any);
    s3Mock.on(PutObjectCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});

    prisma = new PrismaServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        FilesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useClass: ConfigServiceMock },
        { provide: `PinoLogger:${FilesService.name}`, useClass: LoggerMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowAuthGuard)
      .overrideInterceptor(IdempotencyInterceptor)
      .useClass(NoopIdem)
      .compile();

    app = module.createNestApplication();
    // Nếu bạn dùng ZodValidationPipe ở main.ts thì có thể set tương tự ở đây
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('happy path: presign-put → complete → thumbnail → download → delete', async () => {
    // presign-put
    const presign = await request(app.getHttpServer())
      .post('/files/presign-put')
      .set('Idempotency-Key', '11111111-1111-4111-8111-111111111111')
      .send({
        filename: 'photo.jpg',
        mime: 'image/jpeg',
        sizeMax: 5 * 1024 * 1024,
      })
      .expect(201);

    const fileId = presign.body.fileId;
    expect(fileId).toBeDefined();

    // complete
    const complete = await request(app.getHttpServer())
      .post(`/files/${fileId}/complete`)
      .expect(201);

    expect(complete.body.ok).toBe(true);
    expect(complete.body.file.status).toBe('READY');

    // thumbnail
    const thumb = await request(app.getHttpServer())
      .post(`/files/${fileId}/thumbnail`)
      .send({ maxSize: 512 })
      .expect(201);

    expect(thumb.body.ok).toBe(true);
    expect(thumb.body.file.thumbKey).toContain('.thumb.jpg');

    // download (override name)
    const dl = await request(app.getHttpServer())
      .get(`/files/${fileId}/download`)
      .query({ downloadName: 'myfile.jpg', expires: 600 })
      .expect(200);
    expect(dl.body.ok).toBe(true);
    expect(dl.body.url).toContain('https://signed-get-url');

    // delete
    const del = await request(app.getHttpServer())
      .delete(`/files/${fileId}`)
      .query({ force: 1 })
      .expect(200);

    expect(del.body).toEqual({ ok: true, deleted: fileId });

    // download again should 404 due to NotFound in complete()
    await request(app.getHttpServer())
      .get(`/files/${fileId}/download`)
      .expect(404);
  });

  it('presign-post returns 400 (R2 does not support POST)', async () => {
    await request(app.getHttpServer())
      .post('/files/presign-post')
      .set('Idempotency-Key', '22222222-2222-4222-8222-222222222222')
      .send({ filename: 'x.png', mime: 'image/png' })
      .expect(400);
  });

  it('delete without force fails when attached', async () => {
    // create
    const pr = await request(app.getHttpServer())
      .post('/files/presign-put')
      .set('Idempotency-Key', '33333333-3333-4333-8333-333333333333')
      .send({ filename: 'a.jpg', mime: 'image/jpeg' })
      .expect(201);

    const fileId = pr.body.fileId;
    await request(app.getHttpServer())
      .post(`/files/${fileId}/complete`)
      .expect(201);
    // add attachment
    (prisma.fileObject as any)._attach(fileId);
    // delete without force
    await request(app.getHttpServer()).delete(`/files/${fileId}`).expect(409);
  });
});
