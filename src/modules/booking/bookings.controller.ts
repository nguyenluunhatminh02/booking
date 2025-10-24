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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingDto, CancelBookingDto } from './dto';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new booking' })
  @ApiCreatedResponse({ description: 'Booking created successfully' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user bookings' })
  @ApiOkResponse({ description: 'List of bookings' })
  async findByUser(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.bookingsService.findByUser(userId, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get booking statistics' })
  @ApiOkResponse({ description: 'Booking statistics' })
  async getStats(@CurrentUser('id') userId: string) {
    return this.bookingsService.getStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details' })
  @ApiOkResponse({ description: 'Booking details' })
  async findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update booking' })
  @ApiOkResponse({ description: 'Booking updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, userId, dto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm booking' })
  @ApiOkResponse({ description: 'Booking confirmed' })
  async confirm(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.bookingsService.confirm(id, userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiOkResponse({ description: 'Booking cancelled' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, userId, dto);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Confirm refund' })
  @ApiOkResponse({ description: 'Refund confirmed' })
  async confirmRefund(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.bookingsService.confirmRefund(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete booking' })
  @ApiOkResponse({ description: 'Booking deleted' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.bookingsService.delete(id, userId);
  }
}
