import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import * as presigner from '@aws-sdk/s3-request-presigner';

import { Readable } from 'stream';
import { FilesService } from './files.service';
import { PrismaService } from '@/prisma/prisma.service';

const s3Mock = mockClient(S3Client);

// ---- Helpers ----
function jpegHeaderBuffer(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
}

// In-memory Prisma mock
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
  private files = new Map<string, FileRow>();
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

// Config mock
class ConfigServiceMock {
  private readonly map = new Map<string, string>([
    ['R2_BUCKET', 'test-bucket'],
    ['FILES_CDN_BASE_URL', 'https://cdn.example.com'],
    ['R2_S3_ENDPOINT', 'https://accountid.r2.cloudflarestorage.com'],
    ['R2_ACCESS_KEY_ID', 'AKIA_TEST'],
    ['R2_SECRET_ACCESS_KEY', 'SECRET_TEST'],
    ['R2_REGION', 'auto'],
  ]);
  get<T = any>(key: string): T | undefined {
    return this.map.get(key) as unknown as T;
  }
}

// Logger mock
class LoggerMock {
  info() {}
  warn() {}
  error() {}
}

// Mock sharp to avoid native image ops
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

describe('FilesService (unit)', () => {
  let service: FilesService;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    s3Mock.reset();
    // default S3 behavior
    s3Mock
      .on(HeadObjectCommand)
      .resolves({ ContentLength: 1024, ETag: '"etag123"' });
    s3Mock
      .on(GetObjectCommand)
      .callsFake(() => ({ Body: Readable.from(jpegHeaderBuffer()) }) as any);
    s3Mock.on(PutObjectCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});

    prisma = new PrismaServiceMock();
    service = new FilesService(
      prisma as unknown as PrismaService,
      new ConfigServiceMock() as any,
      new LoggerMock() as any,
    );
  });

  it('presignPut returns signed url & creates UPLOADING record', async () => {
    const res = await service.presignPut(
      'photo.jpg',
      'image/jpeg',
      5 * 1024 * 1024,
    );
    expect(res.method).toBe('PUT');
    const row = await prisma.fileObject.findUnique({
      where: { id: res.fileId },
    });
    expect(row?.status).toBe('UPLOADING');
    expect(row?.declaredMime).toBe('image/jpeg');
    expect(row?.maxBytes?.toString()).toBe(String(5 * 1024 * 1024));
  });

  it('presignPost throws on R2 endpoint', async () => {
    await expect(service.presignPost('x.png', 'image/png')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('complete turns UPLOADING into READY with sniffed mime & etag', async () => {
    const { fileId } = await service.presignPut('p.jpg', 'image/jpeg');
    const out = await service.complete(fileId);
    expect(out.status).toBe('READY');
    expect(out.etag).toBe('etag123');
    expect(out.sniffedMime).toBe('image/jpeg');
    expect(Number(out.size)).toBe(1024);
  });

  it('complete enforces maxBytes and deletes object if exceeded', async () => {
    const { fileId } = await service.presignPut('p.jpg', 'image/jpeg', 100); // 100 bytes limit
    // HEAD returns 1024 (default), expect error
    await expect(service.complete(fileId)).rejects.toThrow(BadRequestException);
    // ensure delete was called
    expect(s3Mock.commandCalls(DeleteObjectCommand).length).toBeGreaterThan(0);
  });

  it('createThumbnail writes .thumb.jpg & updates dimensions', async () => {
    const { fileId } = await service.presignPut('p.jpg', 'image/jpeg');
    await service.complete(fileId);
    const out = await service.createThumbnail(fileId, 400);
    expect(out.thumbKey).toContain('.thumb.jpg');
    expect(out.width).toBe(100);
    expect(out.height).toBe(80);
  });

  it('presignGetForDownload returns signed url', async () => {
    const url = await service.presignGetForDownload('uploads/k', 'x.jpg', 300);
    expect(url.url).toBe('https://signed-get-url');
    expect(url.expiresIn).toBe(300);
  });

  it('deleteFile denies when attached and not force', async () => {
    const { fileId } = await service.presignPut('p.jpg', 'image/jpeg');
    await service.complete(fileId);
    (prisma.fileObject as any)._attach(fileId);
    await expect(service.deleteFile(fileId, false)).rejects.toThrow(
      ConflictException,
    );
  });

  it('deleteFile removes when force', async () => {
    const { fileId } = await service.presignPut('p.jpg', 'image/jpeg');
    await service.complete(fileId);
    const res = await service.deleteFile(fileId, true);
    expect(res).toEqual({ ok: true, deleted: fileId });
    await expect(
      prisma.fileObject.findUnique({ where: { id: fileId } }),
    ).resolves.toBeNull();
  });

  it('complete throws NotFound for unknown id', async () => {
    await expect(service.complete('nope')).rejects.toThrow(NotFoundException);
  });
});
