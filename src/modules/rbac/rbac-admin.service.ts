import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getPermissionRecords } from './constants/permission-mappings';

@Injectable()
export class RbacAdminService {
  private readonly log = new Logger(RbacAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seedDefaultPermissions() {
    const permissions = getPermissionRecords();

    let created = 0;
    let skipped = 0;

    for (const perm of permissions) {
      try {
        await this.prisma.permission.upsert({
          where: { name: perm.name },
          update: {},
          create: perm,
        });
        created++;
      } catch {
        this.log.warn(`Permission ${perm.name} already exists, skipping`);
        skipped++;
      }
    }

    this.log.log(`Seeded ${created} permissions (${skipped} skipped)`);
    return { created, skipped, total: permissions.length };
  }

  async createDefaultRoles() {
    const roles = [
      { name: 'admin', desc: 'Full system access', isSystem: true },
      { name: 'moderator', desc: 'Content moderation access', isSystem: true },
      { name: 'user', desc: 'Basic user access', isSystem: true },
    ];

    for (const role of roles) {
      await this.prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      });
    }

    this.log.log('Created default roles');
  }

  async assignPermissionsToRole(roleName: string, permissionNames: string[]) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) throw new Error(`Role ${roleName} not found`);

    for (const permName of permissionNames) {
      const perm = await this.prisma.permission.findUnique({
        where: { name: permName },
      });
      if (!perm) {
        this.log.warn(`Permission ${permName} not found, skipping`);
        continue;
      }

      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }

    this.log.log(
      `Assigned ${permissionNames.length} permissions to role ${roleName}`,
    );
  }

  async setupDefaultRbac() {
    // 1. Seed permissions
    await this.seedDefaultPermissions();

    // 2. Create roles
    await this.createDefaultRoles();

    // 3. Assign permissions to roles
    await this.assignPermissionsToRole('admin', [
      'user.read',
      'user.create',
      'user.update',
      'user.delete',
      'booking.read',
      'booking.create',
      'booking.update',
      'booking.delete',
      'booking.confirm',
      'booking.cancel',
      'booking.refund',
      'file.read',
      'file.upload',
      'file.delete',
      'role.read',
      'role.create',
      'role.update',
      'role.delete',
      'permission.read',
      'permission.assign',
    ]);

    await this.assignPermissionsToRole('moderator', [
      'user.read',
      'booking.read',
      'booking.update',
      'booking.confirm',
      'booking.cancel',
      'file.read',
      'file.delete',
    ]);

    await this.assignPermissionsToRole('user', [
      'user.read',
      'booking.read',
      'booking.create',
      'booking.update',
      'file.read',
      'file.upload',
    ]);

    return { success: true, message: 'Default RBAC setup complete' };
  }
}
