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
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  ApiOperationDecorator,
  ApiResponseType,
} from '../../common/decorators';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperationDecorator({
    summary: 'Create review',
    description: 'Create a new review for a property or booking',
    bodyType: CreateReviewDto,
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Unauthorized],
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
    @Headers('idempotency-key') idemKey?: string,
  ) {
    return this.reviewService.create(userId, dto, idemKey);
  }

  @Get('property/:propertyId')
  @ApiOperationDecorator({
    summary: 'List reviews by property',
    description: 'Retrieve all reviews for a specific property',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async listByProperty(
    @Param('propertyId') propertyId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.listByProperty(
      propertyId,
      cursor,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperationDecorator({
    summary: 'Update review',
    description: 'Update an existing review',
    bodyType: UpdateReviewDto,
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @Headers('idempotency-key') idemKey?: string,
  ) {
    return this.reviewService.update(userId, id, dto, idemKey);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperationDecorator({
    summary: 'Delete review (soft delete)',
    description: 'Delete a review (marks as inactive without removing data)',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Headers('idempotency-key') idemKey?: string,
  ) {
    return this.reviewService.remove(userId, id, idemKey);
  }
}
