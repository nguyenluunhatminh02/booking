import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import {
  Roles,
  ApiOperationDecorator,
  ApiResponseType,
} from '@/common/decorators';
import { QueueService } from '@/core/queue/queue.service';

@ApiTags('Admin - Queue Management')
@Controller('admin/queues')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class QueueAdminController {
  constructor(private readonly queueService: QueueService) {}

  @Get('stats')
  @ApiOperationDecorator({
    summary: 'Get queue statistics',
    description: 'Returns job counts for all queues (admin only)',
    exclude: [ApiResponseType.BadRequest],
  })
  async getStats() {
    return this.queueService.getQueueStats();
  }

  @Post('cleanup/orphan-files')
  @ApiOperationDecorator({
    summary: 'Trigger orphan files cleanup',
    description: 'Manually trigger cleanup of orphan files (admin only)',
    exclude: [ApiResponseType.BadRequest],
  })
  async cleanupOrphanFiles(@Body() body: { olderThanHours?: number }) {
    const olderThan = body.olderThanHours
      ? new Date(Date.now() - body.olderThanHours * 60 * 60 * 1000)
      : undefined;

    const job = await this.queueService.cleanupOrphanFiles(olderThan);
    return {
      message: 'Cleanup job queued',
      jobId: job.id,
    };
  }

  @Post('cleanup/expired-tokens')
  @ApiOperationDecorator({
    summary: 'Trigger expired tokens cleanup',
    description: 'Manually trigger cleanup of expired tokens (admin only)',
    exclude: [ApiResponseType.BadRequest],
  })
  async cleanupExpiredTokens() {
    const job = await this.queueService.cleanupExpiredTokens();
    return {
      message: 'Cleanup job queued',
      jobId: job.id,
    };
  }

  @Post('cleanup/idempotency')
  @ApiOperationDecorator({
    summary: 'Trigger idempotency cleanup',
    description:
      'Manually trigger cleanup of old idempotency records (admin only)',
    exclude: [ApiResponseType.BadRequest],
  })
  async cleanupIdempotency(@Body() body: { olderThanDays?: number }) {
    const olderThan = body.olderThanDays
      ? new Date(Date.now() - body.olderThanDays * 24 * 60 * 60 * 1000)
      : undefined;

    const job = await this.queueService.cleanupExpiredIdempotency(olderThan);
    return {
      message: 'Cleanup job queued',
      jobId: job.id,
    };
  }

  @Post('cleanup/refresh-tokens')
  @ApiOperationDecorator({
    summary: 'Trigger refresh tokens cleanup',
    description: 'Manually trigger cleanup of old refresh tokens (admin only)',
    exclude: [ApiResponseType.BadRequest],
  })
  async cleanupRefreshTokens() {
    const job = await this.queueService.cleanupOldRefreshTokens();
    return {
      message: 'Cleanup job queued',
      jobId: job.id,
    };
  }
}
