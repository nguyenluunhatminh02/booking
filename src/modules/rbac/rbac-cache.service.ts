import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../common/services/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

type UserStamp = {
  userId: string;
  userVer: number;
  roleVer: number;
  roles: string[];
  perms: string[];
};

@Injectable()
export class RbacCacheService implements OnModuleInit {
  private readonly log = new Logger(RbacCacheService.name);

  // In-memory L1 (fallback when Redis down)
  private l1Map = new Map<string, UserStamp>();
  private readonly L1_MAX = 500;
  private readonly L1_TTL_MS = 30_000; // 30s

  // Key builders
  private userKey(userId: string) {
    return `rbac:user:${userId}`;
  }
  private roleVerKey() {
    return `rbac:roleVer`;
  }

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.initRoleVer();
  }

  // -------- Role versioning --------
  private async initRoleVer() {
    try {
      const ver = await this.redis.get(this.roleVerKey());
      if (!ver) {
        await this.redis.set(this.roleVerKey(), '1');
        this.log.log('Initialized roleVer=1');
      }
    } catch (e: any) {
      this.log.warn('initRoleVer failed: ' + e?.message);
    }
  }

  async getRoleVer(): Promise<number> {
    try {
      const s = await this.redis.get(this.roleVerKey());
      return s ? parseInt(s, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  async incrRoleVer(): Promise<void> {
    try {
      await this.redis.incr(this.roleVerKey());
      this.log.log('Incremented roleVer');
    } catch (e: any) {
      this.log.warn('incrRoleVer failed: ' + e?.message);
    }
  }

  // -------- UserStamp caching (dual L1 + Redis) --------
  async getUserStamp(userId: string): Promise<UserStamp | null> {
    // Try L1
    const l1 = this.l1Map.get(userId);
    if (l1) return l1;

    // Try Redis
    try {
      const stamp = await this.redis.getJSON<UserStamp>(this.userKey(userId));
      if (stamp) {
        this.setL1(userId, stamp);
        return stamp;
      }
    } catch (e: any) {
      this.log.warn(`getUserStamp Redis failed: ${e?.message}`);
    }

    return null;
  }

  async setUserStamp(userId: string, stamp: UserStamp): Promise<void> {
    // L1
    this.setL1(userId, stamp);

    // Redis (3 min TTL)
    try {
      await this.redis.setJSON(this.userKey(userId), stamp, 180);
    } catch (e: any) {
      this.log.warn(`setUserStamp Redis failed: ${e?.message}`);
    }
  }

  async invalidateUser(userId: string): Promise<void> {
    this.l1Map.delete(userId);
    try {
      await this.redis.del(this.userKey(userId));
    } catch {
      /* empty */
    }
  }

  async invalidateAll(): Promise<void> {
    this.l1Map.clear();
    this.log.log('Cleared L1 cache');
    // Redis wildcard delete is expensive, skip for now
  }

  // -------- L1 helpers --------
  private setL1(userId: string, stamp: UserStamp) {
    if (this.l1Map.size >= this.L1_MAX) {
      const first = this.l1Map.keys().next().value;
      if (first) this.l1Map.delete(first);
    }
    this.l1Map.set(userId, stamp);
  }

  // -------- Fetch user version from DB --------
  async fetchUserVer(userId: string): Promise<number> {
    try {
      const u = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { version: true },
      });
      return u?.version || 0;
    } catch {
      return 0;
    }
  }

  // -------- Build UserStamp from DB --------
  async buildUserStamp(userId: string): Promise<UserStamp | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          version: true,
          userRoles: {
            select: {
              role: {
                select: {
                  name: true,
                  rolePerms: {
                    select: {
                      permission: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) return null;

      const roleVer = await this.getRoleVer();
      const roles = user.userRoles.map((ur) => ur.role.name);
      const permSet = new Set<string>();

      for (const ur of user.userRoles) {
        for (const rp of ur.role.rolePerms) {
          permSet.add(rp.permission.name);
        }
      }

      const stamp: UserStamp = {
        userId: user.id,
        userVer: user.version,
        roleVer,
        roles,
        perms: Array.from(permSet),
      };

      await this.setUserStamp(userId, stamp);
      return stamp;
    } catch (e: any) {
      this.log.error(`buildUserStamp failed for user ${userId}: ${e?.message}`);
      return null;
    }
  }
}
