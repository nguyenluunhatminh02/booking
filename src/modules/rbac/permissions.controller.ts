import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
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
  @ApiOperation({ summary: 'Create new permission' })
  @ApiCreatedResponse({ description: 'Permission created successfully' })
  async create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Get()
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiOkResponse({ description: 'List of all permissions' })
  async findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiOkResponse({ description: 'Permission details' })
  async findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Delete permission' })
  @ApiOkResponse({ description: 'Permission deleted successfully' })
  async delete(@Param('id') id: string) {
    return this.permissionsService.delete(id);
  }

  @Post('seed')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Seed default permissions' })
  @ApiOkResponse({ description: 'Default permissions seeded' })
  async seed() {
    return this.permissionsService.seedDefaults();
  }
}
