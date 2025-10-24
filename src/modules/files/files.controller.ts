// src/modules/files/files.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { FilesService } from '@/modules/files/files.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import {
  Idempotent,
  IdempotencyInterceptor,
} from '@/common/interceptors/idempotency.interceptor';

import {
  PresignPutDto,
  PresignPostDto,
  CreateThumbnailDto,
  DeleteFileDto,
  FileIdParamDto,
  DownloadQueryDto,
} from '@/common/dto/upload.dto';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // ===== Presign PUT (Cloudflare R2 khuyến nghị) =====
  @Post('presign-put')
  @UseInterceptors(IdempotencyInterceptor)
  @Idempotent()
  @ApiOperation({
    summary: 'Generate presigned PUT URL (Cloudflare R2)',
    description:
      'Trả về URL presign để upload trực tiếp bằng PUT. ' +
      'Yêu cầu header Idempotency-Key (UUID v4).',
  })
  async presignPut(@Body() dto: PresignPutDto) {
    return this.filesService.presignPut(dto.filename, dto.mime, dto.sizeMax);
  }

  // ===== Presign POST (S3/MinIO — KHÔNG hỗ trợ R2) =====
  @Post('presign-post')
  @UseInterceptors(IdempotencyInterceptor)
  @Idempotent()
  @ApiOperation({
    summary: 'Generate presigned POST URL (S3/MinIO)',
    description:
      'Trả về URL + form fields để upload bằng POST (policy). ' +
      'Cloudflare R2 không hỗ trợ — hãy dùng presign-put.',
  })
  async presignPost(@Body() dto: PresignPostDto) {
    return this.filesService.presignPost(dto.filename, dto.mime, dto.sizeMax);
  }

  // ===== Hoàn tất upload (verify + READY, idempotent) =====
  @Post(':fileId/complete')
  @ApiOperation({
    summary: 'Complete file upload',
    description:
      'HEAD object lấy size/etag, enforce maxBytes, sniff MIME 128KB, cập nhật READY. ' +
      'Idempotent nếu đã READY.',
  })
  async complete(@Param() params: FileIdParamDto) {
    const file = await this.filesService.complete(params.fileId);
    return { ok: true, file: this.filesService.attachPublicUrl(file) };
  }

  // ===== Tạo thumbnail (đồng bộ) =====
  @Post(':fileId/thumbnail')
  @ApiOperation({
    summary: 'Create thumbnail for image',
    description:
      'Sinh thumbnail .thumb.jpg cho ảnh (jpeg/png/webp/gif). Lưu width/height.',
  })
  async createThumbnail(
    @Param() params: FileIdParamDto,
    @Body() dto: CreateThumbnailDto,
  ) {
    const file = await this.filesService.createThumbnail(
      params.fileId,
      dto.maxSize ?? 512,
    );
    return { ok: true, file: this.filesService.attachPublicUrl(file) };
  }

  // ===== Presign download (kèm tên file nếu muốn) =====
  @Get(':fileId/download')
  @ApiOperation({
    summary: 'Get presigned download URL',
    description:
      'Trả về URL presign tạm thời để tải file. Mặc định 600s. ' +
      'Có thể truyền ?downloadName=abc.ext để set Content-Disposition.',
  })
  async presignDownload(
    @Param() params: FileIdParamDto,
    @Query() q: DownloadQueryDto,
  ) {
    // Đảm bảo đã READY (idempotent)
    const file = await this.filesService.complete(params.fileId);

    // Suy ra tên file gốc nếu client không override
    const suggestedName = file.key.split('/').pop() ?? file.id;

    const { url, expiresIn } = await this.filesService.presignGetForDownload(
      file.key,
      q.downloadName ?? suggestedName,
      q.expires ?? 600, // default to 600 seconds if not provided
    );

    return { ok: true, url, expiresIn };
  }

  // ===== Xoá file =====
  @Delete(':fileId')
  @ApiOperation({
    summary: 'Delete file',
    description:
      'Xoá object trên storage và record DB. ' +
      'Dùng ?force=1 để xoá cả khi đang attach vào entity khác.',
  })
  async deleteFile(
    @Param() params: FileIdParamDto,
    @Query() query: DeleteFileDto,
  ) {
    return this.filesService.deleteFile(params.fileId, !!query.force);
  }
}
