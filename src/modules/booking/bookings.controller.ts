import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards';
import {
  CurrentUser,
  ApiOperationDecorator,
  ApiResponseType,
} from '@/common/decorators';
import { RequirePermissions } from '@/modules/rbac/decorators';
import { Permissions } from '@/modules/rbac/constants';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingDto, CancelBookingDto } from './dto';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  @RequirePermissions([Permissions.BOOKING.CREATE])
  @ApiOperationDecorator({
    summary: 'Create new booking',
    bodyType: CreateBookingDto,
    exclude: [ApiResponseType.Forbidden, ApiResponseType.NotFound],
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(userId, dto);
  }

  @Get()
  @RequirePermissions([Permissions.BOOKING.READ])
  @ApiOperationDecorator({
    summary: 'Get user bookings',
    description:
      'Retrieve all bookings for the current user with optional status filter',
    exclude: [ApiResponseType.BadRequest],
  })
  async findByUser(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.bookingsService.findByUser(userId, status);
  }

  @Get('stats')
  @RequirePermissions([Permissions.BOOKING.READ])
  @ApiOperationDecorator({
    summary: 'Get booking statistics',
    description: 'Get booking statistics for the current user',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.UnprocessableEntity],
  })
  async getStats(@CurrentUser('id') userId: string) {
    return this.bookingsService.getStats(userId);
  }

  @Get(':id')
  @RequirePermissions([Permissions.BOOKING.READ])
  @ApiOperationDecorator({
    summary: 'Get booking details',
    description: 'Retrieve detailed information for a specific booking',
    exclude: [ApiResponseType.BadRequest],
  })
  async findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions([Permissions.BOOKING.UPDATE])
  @ApiOperationDecorator({
    summary: 'Update booking',
    bodyType: UpdateBookingDto,
    description: 'Update booking details',
    exclude: [ApiResponseType.Forbidden],
  })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, userId, dto);
  }

  @Post(':id/confirm')
  @RequirePermissions([Permissions.BOOKING.CONFIRM])
  @ApiOperationDecorator({
    summary: 'Confirm booking',
    description: 'Mark booking as confirmed',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Forbidden],
  })
  async confirm(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.bookingsService.confirm(id, userId);
  }

  @Post(':id/cancel')
  @RequirePermissions([Permissions.BOOKING.CANCEL])
  @ApiOperationDecorator({
    summary: 'Cancel booking',
    bodyType: CancelBookingDto,
    description: 'Cancel booking with reason (triggers saga compensation)',
    exclude: [ApiResponseType.Forbidden],
  })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, userId, dto);
  }

  @Post(':id/refund')
  @RequirePermissions([Permissions.BOOKING.REFUND])
  @ApiOperationDecorator({
    summary: 'Confirm refund',
    description: 'Confirm and process booking refund',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Forbidden],
  })
  async confirmRefund(@Param('id') id: string) {
    return this.bookingsService.confirmRefund(id);
  }

  @Delete(':id')
  @RequirePermissions([Permissions.BOOKING.DELETE])
  @ApiOperationDecorator({
    summary: 'Delete booking',
    description: 'Permanently delete a booking',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Forbidden],
  })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.bookingsService.delete(id, userId);
  }
}
