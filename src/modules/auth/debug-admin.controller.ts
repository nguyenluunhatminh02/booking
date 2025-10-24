import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SystemRole } from '@prisma/client';
import { hashToken } from '@/common/utils';

@Controller('debug/admin')
export class DebugAdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  @Post('create')
  async createAdmin(
    @Body() body: { email?: string; password?: string; name?: string },
  ) {
    const isProd =
      String(this.config.get('NODE_ENV') || '').toLowerCase() === 'production';
    if (isProd) throw new BadRequestException('Not allowed in production');

    const email = (body?.email || 'admin@example.com').toLowerCase();
    const password = body?.password || 'Admin123!';
    const name = body?.name || 'Admin User';
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || 'Admin';
    const lastName = parts.slice(1).join(' ') || firstName;

    // Ensure user exists and has ADMIN role
    let existing: any = await this.usersService.findByEmail(email);
    if (!existing) {
      // Use UsersService.create to persist user (handles hashing)
      existing = (await this.usersService.create({
        email,
        password,
        firstName,
        lastName,
        role: SystemRole.ADMIN,
      })) as any;
    } else if (existing.role !== SystemRole.ADMIN) {
      // Promote to ADMIN
      await this.usersService.update(existing.id as string, {
        role: SystemRole.ADMIN,
      });
      existing = await this.usersService.findByEmail(email);
    }

    const payload = {
      sub: existing.id as string,
      email: existing.email as string,
      role: (existing.role as string) || SystemRole.ADMIN,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '1d',
    } as any);

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    } as any);

    // Parse refresh expires to Date (support formats like '7d', '1h')
    const parseExpires = (s: string) => {
      const units: Record<string, number> = {
        s: 1000,
        m: 60_000,
        h: 3_600_000,
        d: 86_400_000,
      };
      const match = String(s).match(/^(\d+)([smhd])$/);
      if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const [, val, unit] = match;
      return new Date(Date.now() + Number(val) * units[unit]);
    };

    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const expiresAt = parseExpires(expiresIn);

    try {
      await this.prisma.refreshToken.create({
        data: {
          userId: existing.id,
          tokenHash: hashToken(refreshToken),
          expiresAt,
        },
      });
    } catch {
      // Best-effort: if DB write fails, continue and just return tokens
      // (this can happen in environments without DB during dev)
    }

    return {
      ok: true,
      user: {
        id: existing.id,
        email: existing.email,
        role: existing.role,
      },
      accessToken,
      refreshToken,
    };
  }
}
