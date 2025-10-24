import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { extname } from 'path';
import { PrismaService } from '@/prisma/prisma.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { FileStatus } from '@prisma/client';

// ===== MIME Type Whitelist =====
const AUDIO_MIMES = [
  'audio/mpeg', // mp3
  'audio/mp4', // m4a
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/aac',
  'audio/x-m4a',
  'audio/3gpp',
  'audio/opus',
  'video/webm', // MediaRecorder fallback
];

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
  ...AUDIO_MIMES,
];

// ===== Utils =====
function sanitizeFilename(input: string): string {
  const cleaned = (input || '')
    .replace(/[^\x20-\x7E]+/g, '') // remove control chars
    .replace(/[\\/]+/g, '') // strip slash/backslash
    .trim();
  const safe = cleaned.slice(0, 180);
  return safe || 'file';
}

// Convert stream to buffer (supports multiple stream types)
async function streamToBuffer(stream: any): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0);

  if (typeof stream.transformToByteArray === 'function') {
    const arr = await stream.transformToByteArray();
    return Buffer.from(arr);
  }
  if (typeof stream.arrayBuffer === 'function') {
    const ab = await stream.arrayBuffer();
    return Buffer.from(ab);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (typeof Blob !== 'undefined' && stream instanceof Blob) {
    const ab = await stream.arrayBuffer();
    return Buffer.from(ab);
  }

  const chunks: Buffer[] = [];
  return await new Promise((resolve, reject) => {
    stream.on?.('data', (c: Buffer) => chunks.push(c));
    stream.on?.('end', () => resolve(Buffer.concat(chunks)));
    stream.on?.('error', reject);
  });
}

@Injectable()
export class FilesService {
  private readonly bucket: string;
  private readonly s3: S3Client;
  private readonly cdnBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectPinoLogger(FilesService.name)
    private readonly logger: PinoLogger,
    @Optional() private readonly _unused?: unknown, // giữ chỗ nếu bạn muốn inject Queue sau này
  ) {
    this.bucket = this.config.get<string>('R2_BUCKET') || '';
    this.cdnBaseUrl = this.config.get<string>('FILES_CDN_BASE_URL') || '';

    const endpoint = this.config.get<string>('R2_S3_ENDPOINT');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'R2 configuration missing. File service will be limited.',
      );
    }

    this.s3 = new S3Client({
      endpoint,
      region: this.config.get<string>('R2_REGION') || 'auto',
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  private isR2(): boolean {
    const endpoint = this.config.get<string>('R2_S3_ENDPOINT') || '';
    return endpoint.includes('.r2.cloudflarestorage.com');
  }

  // ===== Presign: PUT (khuyến nghị cho R2) =====
  async presignPut(filename: string, mime: string, sizeMax = 25 * 1024 * 1024) {
    if (!ALLOWED_MIMES.includes(mime)) {
      throw new BadRequestException(`MIME type not allowed: ${mime}`);
    }

    const safeName = sanitizeFilename(filename);
    const fileId = randomUUID();
    const key = `uploads/${fileId}/${safeName}`;

    await this.prisma.fileObject.create({
      data: {
        id: fileId,
        bucket: this.bucket,
        key,
        mime,
        declaredMime: mime,
        status: FileStatus.UPLOADING,
        maxBytes: BigInt(sizeMax),
      },
    });

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mime,
      Metadata: { fileId },
    });

    const url = await getSignedUrl(this.s3, cmd, { expiresIn: 600 });

    this.logger.info({ fileId, key }, 'Generated presigned PUT URL');

    return {
      fileId,
      bucket: this.bucket,
      key,
      url,
      expiresIn: 600,
      method: 'PUT' as const,
    };
  }

  // ===== Presign: POST (S3/MinIO; R2 không hỗ trợ) =====
  async presignPost(
    filename: string,
    mime: string,
    sizeMax = 25 * 1024 * 1024,
  ) {
    if (this.isR2()) {
      throw new BadRequestException(
        'Cloudflare R2 does not support Presigned POST. Use PUT method instead.',
      );
    }
    if (!ALLOWED_MIMES.includes(mime)) {
      throw new BadRequestException(`MIME type not allowed: ${mime}`);
    }

    const safeName = sanitizeFilename(filename);
    const fileId = randomUUID();
    const key = `uploads/${fileId}/${safeName}`;

    await this.prisma.fileObject.create({
      data: {
        id: fileId,
        bucket: this.bucket,
        key,
        mime,
        declaredMime: mime,
        status: FileStatus.UPLOADING,
        maxBytes: BigInt(sizeMax),
      },
    });

    const { url, fields } = await createPresignedPost(this.s3, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 0, sizeMax],
        ['eq', '$Content-Type', mime],
      ],
      Fields: { 'Content-Type': mime },
      Expires: 600,
    });

    this.logger.info({ fileId, key }, 'Generated presigned POST URL');

    return {
      fileId,
      bucket: this.bucket,
      key,
      url,
      fields,
      expiresIn: 600,
      method: 'POST' as const,
    };
  }

  // ===== Complete upload: verify, sniff, enforce size, mark READY =====
  async complete(fileId: string) {
    const file = await this.prisma.fileObject.findUnique({
      where: { id: fileId },
    });
    if (!file) throw new NotFoundException('File not found');

    // Idempotent
    if (file.status === FileStatus.READY && file.size && file.size > 0n) {
      this.logger.info(
        { fileId },
        'Complete called on READY file (idempotent).',
      );
      return file;
    }

    // HEAD object
    let head;
    try {
      head = await this.s3.send(
        new HeadObjectCommand({ Bucket: file.bucket, Key: file.key }),
      );
    } catch {
      throw new ConflictException(
        'Object not found in storage (upload may not have completed).',
      );
    }

    const sizeNum = Number(head.ContentLength ?? 0);
    const sizeBig = BigInt(sizeNum);
    const etag =
      typeof head.ETag === 'string' ? head.ETag.replace(/"/g, '') : null;

    // enforce maxBytes
    const maxBytes = file.maxBytes ?? null;
    if (maxBytes !== null && sizeBig > maxBytes) {
      await this.s3
        .send(new DeleteObjectCommand({ Bucket: file.bucket, Key: file.key }))
        .catch(() => undefined);
      throw new BadRequestException(
        `File exceeds limit: ${sizeNum} > ${maxBytes.toString()}`,
      );
    }

    // Read first 128KB to sniff MIME
    const part = await this.s3.send(
      new GetObjectCommand({
        Bucket: file.bucket,
        Key: file.key,
        Range: 'bytes=0-131071',
      }),
    );
    const buffer = await streamToBuffer(part.Body);
    const sniff = await fileTypeFromBuffer(buffer);

    // MIME verification
    if (sniff?.mime) {
      if (!ALLOWED_MIMES.includes(sniff.mime)) {
        await this.s3
          .send(new DeleteObjectCommand({ Bucket: file.bucket, Key: file.key }))
          .catch(() => undefined);
        throw new BadRequestException(`Invalid file type: ${sniff.mime}`);
      }
      if (file.mime !== sniff.mime) {
        await this.prisma.fileObject.update({
          where: { id: fileId },
          data: { mime: sniff.mime },
        });
      }
    } else {
      const declared = file.declaredMime ?? file.mime;
      if (!ALLOWED_MIMES.includes(declared)) {
        await this.s3
          .send(new DeleteObjectCommand({ Bucket: file.bucket, Key: file.key }))
          .catch(() => undefined);
        throw new BadRequestException('File format not recognized');
      }
    }

    // Mark READY
    const updated = await this.prisma.fileObject.update({
      where: { id: fileId },
      data: {
        status: FileStatus.READY,
        size: sizeBig,
        etag,
        sniffedMime: sniff?.mime ?? null,
        completedAt: new Date(),
      },
    });

    this.logger.info(
      { fileId, size: sizeNum, mime: updated.mime, etag },
      'File upload completed',
    );
    return updated;
  }

  // ===== Presign GET (private) =====
  async presignGet(key: string, expiresIn = 600) {
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
    return { url, expiresIn };
  }

  // ===== Presign GET (download as filename) =====
  async presignGetForDownload(key: string, filename?: string, expiresIn = 600) {
    const safeName = filename ? sanitizeFilename(filename) : undefined;
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: safeName
        ? `attachment; filename="${safeName}"`
        : undefined,
    });
    const url = await getSignedUrl(this.s3, cmd, { expiresIn });
    return { url, expiresIn };
  }

  // ===== Create thumbnail for image files =====
  async createThumbnail(fileId: string, maxSize = 512) {
    const file = await this.prisma.fileObject.findUnique({
      where: { id: fileId },
    });
    if (!file) throw new NotFoundException('File not found');
    if (file.status !== FileStatus.READY)
      throw new ConflictException('File not ready');

    const imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!imageMimes.includes(file.mime)) {
      throw new BadRequestException(
        `Cannot create thumbnail for MIME type: ${file.mime}`,
      );
    }

    const obj = await this.s3.send(
      new GetObjectCommand({ Bucket: file.bucket, Key: file.key }),
    );
    const buffer = await streamToBuffer(obj.Body);
    if (!buffer?.length)
      throw new BadRequestException('Failed to download image (empty buffer)');

    if (file.mime === 'image/png') {
      const sig = buffer.subarray(0, 8).toString('hex');
      const PNG_SIG = '89504e470d0a1a0a';
      if (sig !== PNG_SIG)
        throw new BadRequestException('Invalid PNG file (signature mismatch)');
    }

    let metadata: sharp.Metadata | undefined;
    let resized: Buffer;
    try {
      const processor = sharp(buffer, { failOnError: false }).rotate();
      metadata = await processor.metadata();
      resized = await processor
        .resize({
          width: maxSize,
          height: maxSize,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      this.logger.error({ error, fileId }, 'Failed to process image');
      throw new BadRequestException(
        'Failed to process image. File may be corrupted.',
      );
    }

    const thumbKey = `${file.key}.thumb.jpg`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbKey,
        Body: resized,
        ContentType: 'image/jpeg',
      }),
    );

    const updated = await this.prisma.fileObject.update({
      where: { id: fileId },
      data: {
        thumbKey,
        width: metadata?.width ?? null,
        height: metadata?.height ?? null,
      },
    });

    this.logger.info({ fileId, thumbKey }, 'Thumbnail created');

    const thumbUrl = (await this.presignGet(thumbKey)).url;
    return { ...updated, thumbUrl };
  }

  // ===== Delete file from storage & DB =====
  async deleteFile(fileId: string, force = false) {
    const file = await this.prisma.fileObject.findUnique({
      where: { id: fileId },
      include: { attachments: { select: { id: true } } },
    });
    if (!file) throw new NotFoundException('File not found');

    if ((file.attachments?.length ?? 0) > 0 && !force) {
      throw new ConflictException(
        'File is attached to messages. Use ?force=1 to delete anyway.',
      );
    }

    await this.s3
      .send(new DeleteObjectCommand({ Bucket: file.bucket, Key: file.key }))
      .catch(() => undefined);

    if (file.thumbKey) {
      await this.s3
        .send(
          new DeleteObjectCommand({ Bucket: file.bucket, Key: file.thumbKey }),
        )
        .catch(() => undefined);
    }

    await this.prisma.fileObject.delete({ where: { id: fileId } });

    this.logger.info({ fileId }, 'File deleted');
    return { ok: true, deleted: fileId };
  }

  // ===== Upload buffer directly =====
  async putObjectFromBuffer(params: {
    key: string;
    mime: string;
    buffer: Buffer;
  }) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.buffer,
        ContentType: params.mime,
      }),
    );
    this.logger.info(
      { key: params.key, size: params.buffer.length },
      'Buffer uploaded',
    );
    return { bucket: this.bucket, key: params.key };
  }

  // ===== Create file from buffer with automatic key =====
  async createFileFromBuffer(params: {
    buffer: Buffer;
    mime: string;
    size?: number;
    filename?: string;
    keyPrefix?: string;
    allowedMimes?: string[];
  }) {
    const {
      buffer,
      mime,
      size,
      filename,
      keyPrefix = 'uploads',
      allowedMimes,
    } = params;

    const whitelist = allowedMimes || ALLOWED_MIMES;
    if (!whitelist.includes(mime)) {
      throw new BadRequestException(
        `MIME type not allowed: ${mime}. Allowed: ${whitelist.join(', ')}`,
      );
    }

    const fileId = randomUUID();
    const safeName = filename ? sanitizeFilename(filename) : '';
    const safeExt = safeName ? extname(safeName) : '';
    const key = `${keyPrefix}/${new Date().toISOString().slice(0, 10)}/${fileId}${safeExt}`;

    await this.putObjectFromBuffer({ key, mime, buffer });

    const sizeBig = BigInt(size ?? buffer.length);
    const file = await this.prisma.fileObject.create({
      data: {
        id: fileId,
        bucket: this.bucket,
        key,
        mime,
        size: sizeBig,
        status: FileStatus.READY,
        declaredMime: mime,
        sniffedMime: null,
        etag: null,
        completedAt: new Date(),
      },
    });

    this.logger.info(
      { fileId, key, size: Number(sizeBig) },
      'File created from buffer',
    );
    return file;
  }

  // ===== Public CDN URL helper =====
  getPublicUrl(key?: string | null): string | undefined {
    if (!key) return undefined;
    const base = this.cdnBaseUrl.replace(/\/+$/, '');
    return base ? `${base}/${key.replace(/^\/+/, '')}` : undefined;
  }

  attachPublicUrl<T extends { key?: string | null }>(
    file: T,
  ): T & { url?: string } {
    // Convert any BigInt fields to numbers (JSON.stringify cannot handle BigInt)
    const converted: any = { ...file } as any;
    for (const [k, v] of Object.entries(converted)) {
      if (typeof v === 'bigint') {
        // Convert to number for JSON serialization. If precision is a concern,
        // consider converting to string instead.
        converted[k] = Number(v);
      }
    }
    converted.url = this.getPublicUrl(file.key || undefined);
    return converted;
  }

  // ===== Housekeeping: cleanup stale UPLOADING (gọi từ Cron/Job) =====
  async cleanupStaleUploads(maxAgeMinutes = 60) {
    const threshold = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    const stales = await this.prisma.fileObject.findMany({
      where: {
        status: FileStatus.UPLOADING,
        createdAt: { lt: threshold },
      },
      select: { id: true, bucket: true, key: true },
    });

    for (const f of stales) {
      await this.s3
        .send(new DeleteObjectCommand({ Bucket: f.bucket, Key: f.key }))
        .catch(() => undefined);
      await this.prisma.fileObject
        .delete({ where: { id: f.id } })
        .catch(() => undefined);
      this.logger.info({ fileId: f.id }, 'Stale upload cleaned');
    }

    return { cleaned: stales.length };
  }
}
