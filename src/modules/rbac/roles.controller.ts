import {
  Controller,
  Get,
  Post,
  Put,
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
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';

@ApiTags('RBAC - Roles')
@Controller('rbac/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Post()
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Create new role' })
  @ApiCreatedResponse({ description: 'Role created successfully' })
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Get all roles' })
  @ApiOkResponse({ description: 'List of all roles' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiOkResponse({ description: 'Role details' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Put(':id')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Update role' })
  @ApiOkResponse({ description: 'Role updated successfully' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Delete role' })
  @ApiOkResponse({ description: 'Role deleted successfully' })
  async delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }

  @Post(':roleId/permissions/:permissionId')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Add permission to role' })
  @ApiOkResponse({ description: 'Permission added to role' })
  async addPermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rolesService.addPermission(roleId, permissionId);
  }

  @Delete(':roleId/permissions/:permissionId')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Remove permission from role' })
  @ApiOkResponse({ description: 'Permission removed from role' })
  async removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rolesService.removePermission(roleId, permissionId);
  }

  @Post(':roleId/users/:userId')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiOkResponse({ description: 'Role assigned to user' })
  async assignRoleToUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
  ) {
    return this.rolesService.assignRoleToUser(userId, roleId);
  }

  @Delete(':roleId/users/:userId')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiOkResponse({ description: 'Role removed from user' })
  async removeRoleFromUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
  ) {
    return this.rolesService.removeRoleFromUser(userId, roleId);
  }

  @Get('user/:userId/roles')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiOkResponse({ description: 'List of user roles' })
  async getUserRoles(@Param('userId') userId: string) {
    return this.rolesService.getUserRoles(userId);
  }

  @Get('user/:userId/permissions')
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiOkResponse({ description: 'List of user permissions' })
  async getUserPermissions(@Param('userId') userId: string) {
    return this.rolesService.getUserPermissions(userId);
  }
}
