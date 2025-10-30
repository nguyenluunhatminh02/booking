import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePermissionDto } from './dto';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Tạo permission mới
   */
  async create(dto: CreatePermissionDto) {
    const existing = await this.prisma.permission.findUnique({
      where: {
        action_subject: {
          action: dto.action,
          subject: dto.subject,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Permission "${dto.action}:${dto.subject}" already exists`,
      );
    }

    const name = `${dto.subject}.${dto.action}`;

    return this.prisma.permission.create({
      data: {
        name,
        action: dto.action,
        subject: dto.subject,
        desc: dto.desc,
      },
    });
  }

  /**
   * Lấy tất cả permissions
   */
  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lấy permission theo ID
   */
  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID "${id}" not found`);
    }

    return permission;
  }

  /**
   * Lấy permission theo action:subject
   */
  async findByActionSubject(action: string, subject: string) {
    return this.prisma.permission.findUnique({
      where: {
        action_subject: {
          action,
          subject,
        },
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    // Kiểm tra có role nào đang sử dụng permission này không
    const roleCount = await this.prisma.rolePermission.count({
      where: { permissionId: id },
    });

    if (roleCount > 0) {
      throw new BadRequestException(
        `Cannot delete permission. ${roleCount} role(s) still using this permission`,
      );
    }

    return this.prisma.permission.delete({
      where: { id },
    });
  }

  /**
   * Seed default permissions
   */
  async seedDefaults() {
    const defaults = [
      // User permissions
      { action: 'read', subject: 'User' },
      { action: 'create', subject: 'User' },
      { action: 'update', subject: 'User' },
      { action: 'delete', subject: 'User' },

      // Role permissions
      { action: 'read', subject: 'Role' },
      { action: 'create', subject: 'Role' },
      { action: 'update', subject: 'Role' },
      { action: 'delete', subject: 'Role' },

      // Permission permissions
      { action: 'read', subject: 'Permission' },
      { action: 'create', subject: 'Permission' },
      { action: 'delete', subject: 'Permission' },

      // File permissions
      { action: 'read', subject: 'File' },
      { action: 'create', subject: 'File' },
      { action: 'delete', subject: 'File' },

      // ACL permissions
      { action: 'read', subject: 'ACL' },
      { action: 'create', subject: 'ACL' },
      { action: 'update', subject: 'ACL' },
      { action: 'delete', subject: 'ACL' },

      // Booking permissions
      { action: 'read', subject: 'Booking' },
      { action: 'create', subject: 'Booking' },
      { action: 'update', subject: 'Booking' },
      { action: 'delete', subject: 'Booking' },
      { action: 'cancel', subject: 'Booking' },
    ];

    for (const perm of defaults) {
      const name = `${perm.subject}.${perm.action}`;
      await this.prisma.permission.upsert({
        where: {
          action_subject: {
            action: perm.action,
            subject: perm.subject,
          },
        },
        update: {},
        create: {
          name,
          action: perm.action,
          subject: perm.subject,
        },
      });
    }

    return { message: 'Default permissions seeded' };
  }
}
