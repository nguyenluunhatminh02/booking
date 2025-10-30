import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RbacAdminService } from './rbac-admin.service';
import {
  Public,
  ApiOperationDecorator,
  ApiResponseType,
} from '@/common/decorators';

@ApiTags('rbac-admin')
@Controller('rbac/admin')
export class RbacAdminController {
  constructor(private readonly rbacAdmin: RbacAdminService) {}

  @Post('seed')
  @Public()
  @ApiOperationDecorator({
    summary: 'Seed default permissions, roles, and assignments',
    description: 'Initialize database with default RBAC configuration',
    exclude: [ApiResponseType.BadRequest],
  })
  async seedRbac() {
    return this.rbacAdmin.setupDefaultRbac();
  }

  @Post('permissions/seed')
  @Public()
  @ApiOperationDecorator({
    summary: 'Seed permissions only',
    description: 'Initialize database with default permissions',
    exclude: [ApiResponseType.BadRequest],
  })
  async seedPermissions() {
    return this.rbacAdmin.seedDefaultPermissions();
  }

  @Post('roles/seed')
  @Public()
  @ApiOperationDecorator({
    summary: 'Create default roles',
    description: 'Initialize database with default system roles',
    exclude: [ApiResponseType.BadRequest],
  })
  async seedRoles() {
    await this.rbacAdmin.createDefaultRoles();
    return { success: true };
  }
}
