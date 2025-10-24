import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';

@Module({
  imports: [PrismaModule],
  providers: [RolesService, PermissionsService],
  controllers: [RolesController, PermissionsController],
  exports: [RolesService, PermissionsService],
})
export class RbacModule {}
