// src/common/dto/upload.dto.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// 25MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Helpers
const noSlash = (s: string) => !s.includes('/') && !s.includes('\\');
const toBooleanLike = (v: unknown) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'off'].includes(s)) return false;
  }
  return v;
};

// ===== Presign PUT =====
export const presignPutSchema = z.object({
  filename: z
    .string({ error: 'Filename is required' })
    .trim()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .refine(noSlash, 'Filename must not contain slashes'),
  mime: z
    .string({ error: 'MIME type is required' })
    .trim()
    .regex(/^[\w.-]+\/[\w.-]+$/, 'Invalid MIME type format')
    .transform((s) => s.toLowerCase()),
  // dùng coerce để nhận "26214400" (string) hoặc 26214400 (number)
  sizeMax: z.coerce.number().int().positive().max(MAX_FILE_SIZE).optional(),
});
export class PresignPutDto extends createZodDto(presignPutSchema) {}

// ===== Presign POST (S3/MinIO) =====
export const presignPostSchema = presignPutSchema;
export class PresignPostDto extends createZodDto(presignPostSchema) {}

// ===== Thumbnail =====
export const createThumbnailSchema = z.object({
  maxSize: z.coerce
    .number()
    .int()
    .min(64, 'Thumbnail too small')
    .max(2048, 'Thumbnail too large')
    .optional()
    .default(512),
});
export class CreateThumbnailDto extends createZodDto(createThumbnailSchema) {}

// ===== Delete File =====
export const deleteFileSchema = z.object({
  force: z.preprocess(toBooleanLike, z.boolean().optional().default(false)),
});
export class DeleteFileDto extends createZodDto(deleteFileSchema) {}

// ===== File ID (param) =====
export const fileIdParamSchema = z.object({
  fileId: z.string().uuid('Invalid file ID format'),
});
export class FileIdParamDto extends createZodDto(fileIdParamSchema) {}

// ===== Download query (optional filename + expires) =====
export const downloadQuerySchema = z.object({
  downloadName: z
    .string()
    .trim()
    .max(255)
    .refine(noSlash, 'downloadName must not contain slashes')
    .optional(),
  expires: z.coerce
    .number()
    .int()
    .min(60)
    .max(24 * 60 * 60)
    .optional()
    .default(600),
});
export class DownloadQueryDto extends createZodDto(downloadQuerySchema) {}
