import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import {
  Roles,
  ApiOperationDecorator,
  ApiResponseType,
} from '@/common/decorators';
import { SystemRole } from '@prisma/client';
import { OutboxEventService } from './outbox-event.service';
import { OutboxDispatcher } from './outbox.dispatcher';
import { PrismaService } from '@/prisma/prisma.service';

@ApiTags('Outbox - Event Publishing')
@Controller('outbox')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OutboxController {
  constructor(
    private outboxEventService: OutboxEventService,
    private outboxDispatcher: OutboxDispatcher,
    private prisma: PrismaService,
  ) {}

  @Get('events')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Get all outbox events',
    description:
      'List all outbox events with optional filtering by status and topic',
    exclude: [ApiResponseType.BadRequest],
  })
  async getEvents(
    @Query('status') status?: string,
    @Query('topic') topic?: string,
    @Query('limit') limit: number = 50,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (topic) where.topic = topic;

    return this.prisma.outboxEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  @Get('events/pending')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Get pending events',
    description: 'List all pending outbox events',
    exclude: [ApiResponseType.BadRequest],
  })
  async getPendingEvents(@Query('limit') limit: number = 50) {
    return this.outboxEventService.getPendingEvents(limit);
  }

  @Get('events/failed')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Get failed events',
    description: 'List all failed outbox events',
    exclude: [ApiResponseType.BadRequest],
  })
  async getFailedEvents(@Query('limit') limit: number = 50) {
    return this.outboxEventService.getFailedEvents(limit);
  }

  @Get('events/:id')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Get event details',
    description: 'Retrieve details of a specific outbox event',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async getEvent(@Param('id') id: string) {
    return this.prisma.outboxEvent.findUnique({
      where: { id },
    });
  }

  @Post('events/:id/retry')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Retry failed event',
    description: 'Attempt to retry a failed outbox event',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async retryEvent(@Param('id') id: string) {
    return this.outboxEventService.retryEvent(id);
  }

  @Delete('events/:id')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Delete outbox event',
    description: 'Delete a specific outbox event',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async deleteEvent(@Param('id') id: string) {
    return this.prisma.outboxEvent.delete({
      where: { id },
    });
  }

  @Post('cleanup')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Cleanup old sent events',
    description: 'Delete old sent events from outbox based on age',
    exclude: [ApiResponseType.BadRequest],
  })
  async cleanup(@Query('olderThanHours') olderThanHours: number = 24) {
    const result =
      await this.outboxEventService.cleanupSentEvents(olderThanHours);
    return {
      message: 'Cleanup completed',
      deletedCount: result.count,
    };
  }

  @Get('stats')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Get outbox statistics',
    description: 'Retrieve statistics about outbox events by status',
    exclude: [ApiResponseType.BadRequest],
  })
  async getStats() {
    const [total, pending, failed, sent, enqueued] = await Promise.all([
      this.prisma.outboxEvent.count(),
      this.prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
      this.prisma.outboxEvent.count({ where: { status: 'FAILED' } }),
      this.prisma.outboxEvent.count({ where: { status: 'SENT' } }),
      this.prisma.outboxEvent.count({ where: { status: 'ENQUEUED' } }),
    ]);

    return {
      total,
      pending,
      failed,
      sent,
      enqueued,
    };
  }

  @Post('dispatch-all')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Dispatch all pending events',
    description: 'Process and dispatch all pending outbox events',
    exclude: [ApiResponseType.BadRequest],
  })
  async dispatchAll(@Query('batchSize') batchSize: number = 100) {
    return this.outboxDispatcher.dispatchAll(batchSize);
  }

  @Post('retry-dead-letters')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Retry failed events',
    description: 'Retry dead letter events that failed processing',
    exclude: [ApiResponseType.BadRequest],
  })
  async retryDeadLetters(@Query('maxRetries') maxRetries: number = 3) {
    return this.outboxDispatcher.retryDeadLetters(maxRetries);
  }

  @Get('health')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Outbox system health check',
    description: 'Check the health status of the outbox system',
    exclude: [ApiResponseType.BadRequest],
  })
  async healthCheck() {
    return this.outboxDispatcher.healthCheck();
  }
}
