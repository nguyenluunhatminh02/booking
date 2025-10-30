import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService, SendOptions } from './notifications.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send notification' })
  async send(
    @CurrentUser() userId: string,
    @Body()
    dto: {
      key: string;
      ctx: Record<string, any>;
      opts?: SendOptions;
    },
  ) {
    return this.notificationsService.send(userId, dto.key, dto.ctx, dto.opts);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'List in-app notifications' })
  async list(
    @CurrentUser() userId: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.list(userId, {
      limit,
      cursor,
      unreadOnly,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@CurrentUser() userId: string) {
    return this.notificationsService.unreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.notificationsService.markRead(userId, id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all in-app notifications as read' })
  async markAllRead(@CurrentUser() userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'List notification preferences' })
  async listPrefs(@CurrentUser() userId: string) {
    return this.notificationsService.listPrefs(userId);
  }

  @Post('preferences')
  @ApiOperation({ summary: 'Update notification preference' })
  async upsertPref(
    @CurrentUser() userId: string,
    @Body()
    dto: {
      key: string;
      email?: boolean;
      push?: boolean;
      inapp?: boolean;
    },
  ) {
    return this.notificationsService.upsertPref(userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel pending notification' })
  async cancelPending(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.notificationsService.cancelPending(userId, id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry failed notification' })
  async retryFailed(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.notificationsService.retryFailed(userId, id);
  }
}
