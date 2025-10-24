import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { QueueService } from '@/core/queue/queue.service';

@ApiTags('Admin - Queue Management')
@Controller('admin/queues')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class QueueAdminController {
  constructor(private readonly queueService: QueueService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get queue statistics',
    description: 'Returns job counts for all queues (admin only)',
  })
  async getStats() {
    return this.queueService.getQueueStats();
  }

  @Post('cleanup/orphan-files')
  @ApiOperation({
    summary: 'Trigger orphan files cleanup',
    description: 'Manually trigger cleanup of orphan files (admin only)',
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
  @ApiOperation({
    summary: 'Trigger expired tokens cleanup',
    description: 'Manually trigger cleanup of expired tokens (admin only)',
  })
  async cleanupExpiredTokens() {
    const job = await this.queueService.cleanupExpiredTokens();
    return {
      message: 'Cleanup job queued',
      jobId: job.id,
    };
  }

  @Post('cleanup/idempotency')
  @ApiOperation({
    summary: 'Trigger idempotency cleanup',
    description:
      'Manually trigger cleanup of old idempotency records (admin only)',
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
  @ApiOperation({
    summary: 'Trigger refresh tokens cleanup',
    description: 'Manually trigger cleanup of old refresh tokens (admin only)',
  })
  async cleanupRefreshTokens() {
    const job = await this.queueService.cleanupOldRefreshTokens();
    return {
      message: 'Cleanup job queued',
      jobId: job.id,
    };
  }
}
