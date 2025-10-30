import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacCacheService } from './rbac-cache.service';
import type { ACLEffect } from '@prisma/client';

type PermCheckOpts = {
  userId: string;
  required: string[];
  mode?: 'all' | 'any';
  resourceType?: string;
  resourceId?: string;
  ownsResource?: boolean;
};

type PermCheckResult = {
  allowed: boolean;
  reason: string;
  matchedPerms?: string[];
};

@Injectable()
export class RbacService {
  private readonly log = new Logger(RbacService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RbacCacheService,
  ) {}

  // -------- Core permission check --------
  async checkPermissions(opts: PermCheckOpts): Promise<PermCheckResult> {
    const { userId, required, mode = 'all', resourceType, resourceId } = opts;

    if (!required.length) {
      return { allowed: true, reason: 'No permissions required' };
    }

    // 1. Get cached user permissions
    let stamp = await this.cache.getUserStamp(userId);
    const currentRoleVer = await this.cache.getRoleVer();

    // Check version mismatch
    if (!stamp) {
      stamp = await this.cache.buildUserStamp(userId);
      if (!stamp) {
        return { allowed: false, reason: 'User not found' };
      }
    } else {
      // Validate versions
      const userVer = await this.cache.fetchUserVer(userId);
      if (stamp.userVer !== userVer || stamp.roleVer !== currentRoleVer) {
        this.log.debug(`Version mismatch for user ${userId}, rebuilding stamp`);
        stamp = await this.cache.buildUserStamp(userId);
        if (!stamp) {
          return { allowed: false, reason: 'User not found after rebuild' };
        }
      }
    }

    const finalPerms = new Set(stamp.perms);

    // 2. Apply ownership boost (if applicable)
    if (opts.ownsResource && resourceType) {
      const boostPerms = await this.getOwnershipBoost(resourceType);
      boostPerms.forEach((p) => finalPerms.add(p));
    }

    // 3. Apply ACL (if resource specified)
    if (resourceType && resourceId) {
      const acl = await this.getResourceACL(userId, resourceType, resourceId);
      if (acl) {
        if (acl.effect === 'DENY') {
          return {
            allowed: false,
            reason: `Denied by ACL for ${resourceType}:${resourceId}`,
          };
        }
        if (acl.effect === 'ALLOW' && acl.permissions.length) {
          acl.permissions.forEach((p) => finalPerms.add(p));
        }
      }
    }

    // 4. Check permissions based on mode
    const matched: string[] = [];
    for (const p of required) {
      if (finalPerms.has(p)) matched.push(p);
    }

    if (mode === 'all') {
      const allowed = matched.length === required.length;
      return {
        allowed,
        reason: allowed
          ? 'All required permissions granted'
          : `Missing: ${required.filter((p) => !finalPerms.has(p)).join(', ')}`,
        matchedPerms: matched,
      };
    } else {
      const allowed = matched.length > 0;
      return {
        allowed,
        reason: allowed
          ? `Matched: ${matched.join(', ')}`
          : 'No required permissions',
        matchedPerms: matched,
      };
    }
  }

  // -------- Ownership boost (auto-grant permissions for owned resources) --------
  private async getOwnershipBoost(resourceType: string): Promise<string[]> {
    // Example: resource owner gets read/update on their own resource
    const boostMap: Record<string, string[]> = {
      booking: ['booking.read', 'booking.update'],
      file: ['file.read', 'file.delete'],
      // Add more as needed
    };
    return boostMap[resourceType] || [];
  }

  // -------- ACL lookup --------
  private async getResourceACL(
    userId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<{ effect: ACLEffect; permissions: string[] } | null> {
    try {
      const acl = await this.prisma.resourceACL.findFirst({
        where: {
          resourceType,
          resourceId,
          OR: [{ userId }, { roleId: { not: null } }],
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!acl) return null;

      return {
        effect: acl.effect,
        permissions: acl.permissions as string[],
      };
    } catch (e: any) {
      this.log.warn(`getResourceACL failed: ${e?.message}`);
      return null;
    }
  }

  // -------- Expand user permissions (for debugging) --------
  async expandUserPermissions(userId: string): Promise<string[]> {
    const stamp = await this.cache.getUserStamp(userId);
    if (!stamp) {
      const fresh = await this.cache.buildUserStamp(userId);
      return fresh?.perms || [];
    }

    // Validate version
    const userVer = await this.cache.fetchUserVer(userId);
    const roleVer = await this.cache.getRoleVer();

    if (stamp.userVer !== userVer || stamp.roleVer !== roleVer) {
      const fresh = await this.cache.buildUserStamp(userId);
      return fresh?.perms || [];
    }

    return stamp.perms;
  }

  // -------- Get user roles --------
  async getUserRoles(userId: string): Promise<string[]> {
    const stamp = await this.cache.getUserStamp(userId);
    if (!stamp) {
      const fresh = await this.cache.buildUserStamp(userId);
      return fresh?.roles || [];
    }
    return stamp.roles;
  }

  // -------- Helper: Invalidate user cache --------
  async invalidateUserCache(userId: string): Promise<void> {
    await this.cache.invalidateUser(userId);
  }

  // -------- Helper: Invalidate all caches (when role definitions change) --------
  async invalidateAllCaches(): Promise<void> {
    await this.cache.incrRoleVer();
    await this.cache.invalidateAll();
    this.log.log('Invalidated all RBAC caches');
  }
}
