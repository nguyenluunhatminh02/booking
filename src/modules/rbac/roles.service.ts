import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Tạo role mới
   */
  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(`Role "${dto.name}" already exists`);
    }

    return this.prisma.role.create({
      data: {
        name: dto.name,
        desc: dto.desc,
        isSystem: dto.isSystem,
      },
      include: {
        rolePerms: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Lấy tất cả roles
   */
  async findAll() {
    return this.prisma.role.findMany({
      include: {
        rolePerms: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lấy role theo ID
   */
  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePerms: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    return role;
  }

  /**
   * Cập nhật role
   */
  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system roles');
    }

    // Check unique name nếu cần đổi tên
    if (dto.name && dto.name !== role.name) {
      const existing = await this.prisma.role.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new BadRequestException(`Role "${dto.name}" already exists`);
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        desc: dto.desc,
      },
      include: {
        rolePerms: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Xóa role
   */
  async delete(id: string) {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    // Kiểm tra có user nào đang sử dụng role này không
    const userCount = await this.prisma.userRole.count({
      where: { roleId: id },
    });

    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete role. ${userCount} user(s) still using this role`,
      );
    }

    return this.prisma.role.delete({
      where: { id },
    });
  }

  /**
   * Thêm permission vào role
   */
  async addPermission(roleId: string, permissionId: string) {
    const role = await this.findOne(roleId);

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system roles');
    }

    // Kiểm tra permission có tồn tại không
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID "${permissionId}" not found`,
      );
    }

    // Kiểm tra permission đã được gán chưa
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Permission "${permission.action}:${permission.subject}" already assigned to role`,
      );
    }

    await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });

    return this.findOne(roleId);
  }

  /**
   * Xóa permission khỏi role
   */
  async removePermission(roleId: string, permissionId: string) {
    const role = await this.findOne(roleId);

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system roles');
    }

    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Permission not found in role "${role.name}"`,
      );
    }

    await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    return this.findOne(roleId);
  }

  /**
   * Gán role cho user
   */
  async assignRoleToUser(userId: string, roleId: string) {
    const role = await this.findOne(roleId);

    // Kiểm tra user có tồn tại không
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // Kiểm tra user đã có role này chưa
    const existing = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
      },
    });

    if (existing) {
      throw new BadRequestException(`User already has role "${role.name}"`);
    }

    return this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
      include: {
        role: {
          include: {
            rolePerms: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Xóa role khỏi user
   */
  async removeRoleFromUser(userId: string, roleId: string) {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
      },
    });

    if (!userRole) {
      throw new NotFoundException(`User does not have this role`);
    }

    await this.prisma.userRole.delete({
      where: {
        id: userRole.id,
      },
    });

    return { message: 'Role removed from user' };
  }

  /**
   * Lấy roles của user
   */
  async getUserRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    return this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePerms: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Lấy permissions của user (từ tất cả roles của họ)
   */
  async getUserPermissions(userId: string) {
    const userRoles = await this.getUserRoles(userId);

    // Collect tất cả permissions từ tất cả roles
    const permissions = new Map<string, any>();

    for (const userRole of userRoles) {
      for (const rolePerm of userRole.role.rolePerms) {
        const key = `${rolePerm.permission.action}:${rolePerm.permission.subject}`;
        permissions.set(key, rolePerm.permission);
      }
    }

    return Array.from(permissions.values());
  }
}
