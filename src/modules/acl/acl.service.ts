import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ACLEffect } from '@prisma/client';
import { GrantAccessDto, CheckAccessDto } from './dto';

@Injectable()
export class AclService {
  constructor(private prisma: PrismaService) {}

  /**
   * Cấp quyền truy cập tài nguyên cho user
   */
  async grantAccess(dto: GrantAccessDto) {
    // Kiểm tra user tồn tại
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${dto.userId}" not found`);
    }

    return this.prisma.resourceACL.upsert({
      where: {
        user_resource_action_unique: {
          userId: dto.userId,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          action: dto.action,
        },
      },
      update: {
        effect: dto.effect,
        conditions: dto.conditions,
      },
      create: {
        userId: dto.userId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        action: dto.action,
        effect: dto.effect,
        conditions: dto.conditions,
      },
    });
  }

  /**
   * Thu hồi quyền truy cập
   */
  async revokeAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
  ) {
    const acl = await this.prisma.resourceACL.findUnique({
      where: {
        user_resource_action_unique: {
          userId,
          resourceType,
          resourceId,
          action,
        },
      },
    });

    if (!acl) {
      throw new NotFoundException('ACL rule not found');
    }

    return this.prisma.resourceACL.delete({
      where: {
        user_resource_action_unique: {
          userId,
          resourceType,
          resourceId,
          action,
        },
      },
    });
  }

  /**
   * Kiểm tra user có quyền truy cập tài nguyên không
   */
  async checkAccess(dto: CheckAccessDto): Promise<boolean> {
    const acl = await this.prisma.resourceACL.findUnique({
      where: {
        user_resource_action_unique: {
          userId: dto.userId,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          action: dto.action,
        },
      },
    });

    if (!acl) {
      return false;
    }

    // Kiểm tra effect (ALLOW/DENY)
    if (acl.effect === ACLEffect.DENY) {
      return false;
    }

    // Nếu có conditions, kiểm tra context
    if (acl.conditions) {
      return this.evaluateConditions(
        acl.conditions as Record<string, any>,
        dto.context || {},
      );
    }

    return true;
  }

  /**
   * Lấy tất cả quyền truy cập của user trên một tài nguyên
   */
  async getUserResourceAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
  ) {
    return this.prisma.resourceACL.findMany({
      where: {
        userId,
        resourceType,
        resourceId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lấy tất cả tài nguyên mà user có quyền truy cập
   */
  async findUserResources(
    userId: string,
    resourceType: string,
    action: string,
  ) {
    return this.prisma.resourceACL.findMany({
      where: {
        userId,
        resourceType,
        action,
        effect: ACLEffect.ALLOW,
      },
      select: {
        resourceId: true,
        action: true,
      },
      distinct: ['resourceId'],
    });
  }

  /**
   * Xóa tất cả quyền truy cập của user trên một tài nguyên
   */
  async revokeAllUserResourceAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
  ) {
    return this.prisma.resourceACL.deleteMany({
      where: {
        userId,
        resourceType,
        resourceId,
      },
    });
  }

  /**
   * Lấy tất cả ACL rules của một tài nguyên
   */
  async getResourceAcls(resourceType: string, resourceId: string) {
    return this.prisma.resourceACL.findMany({
      where: {
        resourceType,
        resourceId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Xóa tất cả ACL rules của một tài nguyên (khi xóa tài nguyên)
   */
  async deleteResourceAcls(resourceType: string, resourceId: string) {
    return this.prisma.resourceACL.deleteMany({
      where: {
        resourceType,
        resourceId,
      },
    });
  }

  /**
   * Đánh giá conditions (ABAC - Attribute-Based Access Control)
   * Hỗ trợ các operators đơn giản: eq, neq, gt, gte, lt, lte, in, nin
   */
  private evaluateConditions(
    conditions: Record<string, any>,
    context: Record<string, any>,
  ): boolean {
    for (const [key, rule] of Object.entries(conditions)) {
      const contextValue = context[key];

      if (typeof rule === 'object' && rule !== null) {
        // Hỗ trợ operators

        for (const [operator, value] of Object.entries(rule)) {
          if (!this.evaluateOperator(operator, contextValue, value)) {
            return false;
          }
        }
      } else if (contextValue !== rule) {
        return false;
      }
    }

    return true;
  }

  private evaluateOperator(
    operator: string,
    contextValue: any,
    value: any,
  ): boolean {
    switch (operator) {
      case 'eq':
        return contextValue === value;
      case 'neq':
        return contextValue !== value;
      case 'gt':
        return contextValue > value;
      case 'gte':
        return contextValue >= value;
      case 'lt':
        return contextValue < value;
      case 'lte':
        return contextValue <= value;
      case 'in':
        return Array.isArray(value) && value.includes(contextValue);
      case 'nin':
        return Array.isArray(value) && !value.includes(contextValue);
      default:
        return false;
    }
  }
}
