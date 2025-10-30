import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import {
  Roles,
  ApiOperationDecorator,
  ApiResponseType,
} from '@/common/decorators';
import { SystemRole } from '@prisma/client';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto';

@ApiTags('RBAC - Permissions')
@Controller('rbac/permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Post()
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Create new permission',
    description: 'Create a new system permission',
    bodyType: CreatePermissionDto,
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Unauthorized],
  })
  async create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Get()
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Get all permissions',
    description: 'Retrieve list of all system permissions',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Unauthorized],
  })
  async findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Get permission by ID',
    description: 'Retrieve details of a specific permission',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Delete permission',
    description: 'Delete a system permission',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async delete(@Param('id') id: string) {
    return this.permissionsService.delete(id);
  }

  @Post('seed')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Seed default permissions',
    description: 'Seed the system with default permissions',
    exclude: [ApiResponseType.BadRequest],
  })
  async seed() {
    return this.permissionsService.seedDefaults();
  }
}
