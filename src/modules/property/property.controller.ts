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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { UpsertCalendarDto } from './dto/upsert-calendar.dto';
import { GetCalendarDto } from './dto/get-calendar.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  ApiOperationDecorator,
  ApiResponseType,
} from '../../common/decorators';

@ApiTags('Properties')
@Controller('properties')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  @ApiOperationDecorator({
    summary: 'Create new property',
    description: 'Create a new property listing',
    bodyType: CreatePropertyDto,
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Unauthorized],
  })
  async create(
    @CurrentUser('id') hostId: string,
    @Body() dto: CreatePropertyDto,
  ) {
    return this.propertyService.createProperty(hostId, dto);
  }

  @Get('my')
  @ApiOperationDecorator({
    summary: 'List my properties',
    description: 'Get all properties owned by the current user',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Unauthorized],
  })
  async listMy(
    @CurrentUser('id') hostId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.propertyService.listMyProperties(hostId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperationDecorator({
    summary: 'Get property by ID',
    description: 'Retrieve details of a specific property',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async getById(@CurrentUser('id') hostId: string, @Param('id') id: string) {
    return this.propertyService.getMyPropertyById(hostId, id);
  }

  @Patch(':id')
  @ApiOperationDecorator({
    summary: 'Update property',
    description: 'Update property details',
    bodyType: UpdatePropertyDto,
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async update(
    @CurrentUser('id') hostId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertyService.updateProperty(hostId, id, dto);
  }

  @Post(':id/photos')
  @ApiOperationDecorator({
    summary: 'Add photo to property',
    description: 'Add a photo to a property listing',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async addPhoto(
    @CurrentUser('id') hostId: string,
    @Param('id') propertyId: string,
    @Body('fileId') fileId: string,
    @Body('isCover') isCover?: boolean,
    @Body('sortOrder') sortOrder?: number,
  ) {
    return this.propertyService.addPhoto(hostId, propertyId, fileId, {
      isCover,
      sortOrder,
    });
  }

  @Delete('photos/:propertyFileId')
  @ApiOperationDecorator({
    summary: 'Remove photo from property',
    description: 'Delete a photo from a property',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async removePhoto(
    @CurrentUser('id') hostId: string,
    @Param('propertyFileId') propertyFileId: string,
  ) {
    return this.propertyService.removePhoto(hostId, propertyFileId);
  }

  @Patch(':id/photos/cover/:propertyFileId')
  @ApiOperationDecorator({
    summary: 'Set photo as cover',
    description: 'Set a photo as the cover image for property',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async setCover(
    @CurrentUser('id') hostId: string,
    @Param('id') propertyId: string,
    @Param('propertyFileId') propertyFileId: string,
  ) {
    return this.propertyService.setCover(hostId, propertyId, propertyFileId);
  }

  @Patch(':id/photos/reorder')
  @ApiOperationDecorator({
    summary: 'Reorder photos',
    description: 'Change the display order of property photos',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async reorderPhotos(
    @CurrentUser('id') hostId: string,
    @Param('id') propertyId: string,
    @Body('orders')
    orders: Array<{ propertyFileId: string; sortOrder: number }>,
  ) {
    return this.propertyService.reorderPhotos(hostId, propertyId, orders);
  }

  @Post(':id/availability')
  @ApiOperationDecorator({
    summary: 'Upsert availability calendar',
    description: 'Create or update property availability calendar',
    bodyType: UpsertCalendarDto,
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async upsertAvailability(
    @CurrentUser('id') hostId: string,
    @Param('id') propertyId: string,
    @Body() dto: UpsertCalendarDto,
  ) {
    return this.propertyService.upsertAvailability(hostId, propertyId, dto);
  }

  @Get(':id/availability')
  @ApiOperationDecorator({
    summary: 'Get availability calendar',
    description: 'Retrieve property availability calendar',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async getAvailability(
    @CurrentUser('id') hostId: string,
    @Param('id') propertyId: string,
    @Query() query: GetCalendarDto,
  ) {
    return this.propertyService.getAvailability(hostId, propertyId, query);
  }
}
