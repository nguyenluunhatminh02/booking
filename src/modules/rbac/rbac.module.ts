import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { RbacService } from './rbac.service';
import { RbacCacheService } from './rbac-cache.service';
import { RbacAdminService } from './rbac-admin.service';
import { RbacAdminController } from './rbac-admin.controller';
import { PermissionsGuard } from './guards/permissions.guard';
import { RoleGuard } from './guards/role.guard';
import { RedisModule } from '@/common/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [
    RolesService,
    PermissionsService,
    RbacService,
    RbacCacheService,
    RbacAdminService,
    PermissionsGuard,
    RoleGuard,
  ],
  controllers: [RolesController, PermissionsController, RbacAdminController],
  exports: [
    RolesService,
    PermissionsService,
    RbacService,
    RbacCacheService,
    RbacAdminService,
    PermissionsGuard,
    RoleGuard,
  ],
})
export class RbacModule {}
