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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import {
  Roles,
  ApiOperationDecorator,
  ApiResponseType,
} from '@/common/decorators';
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
  @ApiOperationDecorator({
    summary: 'Create new role',
    description: 'Create a new system role',
    bodyType: CreateRoleDto,
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Unauthorized],
  })
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Get all roles',
    description: 'Retrieve list of all system roles',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Unauthorized],
  })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Get role by ID',
    description: 'Retrieve details of a specific role',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Put(':id')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Update role',
    description: 'Update an existing role',
    bodyType: UpdateRoleDto,
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Delete role',
    description: 'Delete a system role',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }

  @Post(':roleId/permissions/:permissionId')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Add permission to role',
    description: 'Add a permission to a role',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async addPermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rolesService.addPermission(roleId, permissionId);
  }

  @Delete(':roleId/permissions/:permissionId')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Remove permission from role',
    description: 'Remove a permission from a role',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rolesService.removePermission(roleId, permissionId);
  }

  @Post(':roleId/users/:userId')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Assign role to user',
    description: 'Assign a role to a user',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async assignRoleToUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
  ) {
    return this.rolesService.assignRoleToUser(userId, roleId);
  }

  @Delete(':roleId/users/:userId')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Remove role from user',
    description: 'Remove a role from a user',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async removeRoleFromUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
  ) {
    return this.rolesService.removeRoleFromUser(userId, roleId);
  }

  @Get('user/:userId/roles')
  @ApiOperationDecorator({
    summary: 'Get user roles',
    description: 'Retrieve all roles assigned to a user',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async getUserRoles(@Param('userId') userId: string) {
    return this.rolesService.getUserRoles(userId);
  }

  @Get('user/:userId/permissions')
  @ApiOperationDecorator({
    summary: 'Get user permissions',
    description:
      'Retrieve all permissions for a user through their assigned roles',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async getUserPermissions(@Param('userId') userId: string) {
    return this.rolesService.getUserPermissions(userId);
  }
}
