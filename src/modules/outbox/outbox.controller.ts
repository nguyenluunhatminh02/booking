import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
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
  @ApiOperation({ summary: 'Get all outbox events' })
  @ApiOkResponse({ description: 'List of outbox events' })
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
  @ApiOperation({ summary: 'Get pending events' })
  @ApiOkResponse({ description: 'List of pending events' })
  async getPendingEvents(@Query('limit') limit: number = 50) {
    return this.outboxEventService.getPendingEvents(limit);
  }

  @Get('events/failed')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Get failed events' })
  @ApiOkResponse({ description: 'List of failed events' })
  async getFailedEvents(@Query('limit') limit: number = 50) {
    return this.outboxEventService.getFailedEvents(limit);
  }

  @Get('events/:id')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Get event details' })
  @ApiOkResponse({ description: 'Event details' })
  async getEvent(@Param('id') id: string) {
    return this.prisma.outboxEvent.findUnique({
      where: { id },
    });
  }

  @Post('events/:id/retry')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Retry failed event' })
  @ApiOkResponse({ description: 'Event retry queued' })
  async retryEvent(@Param('id') id: string) {
    return this.outboxEventService.retryEvent(id);
  }

  @Delete('events/:id')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Delete outbox event' })
  @ApiOkResponse({ description: 'Event deleted' })
  async deleteEvent(@Param('id') id: string) {
    return this.prisma.outboxEvent.delete({
      where: { id },
    });
  }

  @Post('cleanup')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Cleanup old sent events' })
  @ApiOkResponse({ description: 'Cleanup completed' })
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
  @ApiOperation({ summary: 'Get outbox statistics' })
  @ApiOkResponse({ description: 'Outbox statistics' })
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
  @ApiOperation({ summary: 'Dispatch all pending events' })
  @ApiOkResponse({ description: 'Dispatch completed' })
  async dispatchAll(@Query('batchSize') batchSize: number = 100) {
    return this.outboxDispatcher.dispatchAll(batchSize);
  }

  @Post('retry-dead-letters')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Retry failed events' })
  @ApiOkResponse({ description: 'Retry completed' })
  async retryDeadLetters(@Query('maxRetries') maxRetries: number = 3) {
    return this.outboxDispatcher.retryDeadLetters(maxRetries);
  }

  @Get('health')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Outbox system health check' })
  @ApiOkResponse({ description: 'Health check result' })
  async healthCheck() {
    return this.outboxDispatcher.healthCheck();
  }
}
