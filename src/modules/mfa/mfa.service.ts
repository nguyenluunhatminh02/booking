import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { authenticator } from 'otplib';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { randomBytes, randomInt } from 'node:crypto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TokenStateService } from '../auth/token-state.service';

const MFA_CONFIG = {
  TOTP: {
    WINDOW: 1,
    STEP: 30,
    ISSUER: 'Booking-API',
  },
  MAX_VERIFY_ATTEMPTS: 5,
  VERIFY_TIMEOUT_SEC: 900,
  BACKUP_CODE_COUNT: 10,
  BACKUP_CODE_LENGTH: 8,
  RECOVERY_KEY_LENGTH: 32,
  BCRYPT_ROUNDS: 10,
};

@Injectable()
export class MfaService {
  constructor(
    private prisma: PrismaService,
    private auditLogger: AuditLogService,
    private tokenState: TokenStateService,
  ) {
    authenticator.options = {
      window: MFA_CONFIG.TOTP.WINDOW,
      step: MFA_CONFIG.TOTP.STEP,
    };
  }

  async hasMfaEnabled(userId: string) {
    const rec = await this.prisma.userMfa.findUnique({ where: { userId } });
    return !!rec?.totpEnabled;
  }

  async startTotpEnroll(
    userId: string,
    issuer = MFA_CONFIG.TOTP.ISSUER,
    label?: string,
  ) {
    const existing = await this.prisma.userMfa.findUnique({
      where: { userId },
    });

    if (existing?.totpEnabled) {
      throw new BadRequestException('MFA already enabled');
    }

    const secret = authenticator.generateSecret();
    const name = label || userId;
    const otpauth = authenticator.keyuri(name, issuer, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    await this.prisma.userMfa.upsert({
      where: { userId },
      update: {
        totpSecret: secret,
        totpEnabled: false,
        totpVerifiedAt: null,
      },
      create: {
        userId,
        totpSecret: secret,
        totpEnabled: false,
      },
    });

    await this.auditLogger.log({
      action: 'MFA_TOTP_ENROLL_STARTED',
      actorId: userId,
      entity: 'mfa',
    });

    return { secret, otpauth, qrDataUrl };
  }

  async verifyTotpAndEnable(userId: string, code: string) {
    const rec = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!rec) {
      throw new BadRequestException('TOTP not initiated');
    }

    await this.checkRateLimit();

    const ok = authenticator.check(code, rec.totpSecret || '');
    if (!ok) {
      await this.incrementAttempts();
      await this.auditLogger.log({
        action: 'MFA_TOTP_VERIFY_FAILED',
        actorId: userId,
        entity: 'mfa',
      });
      throw new UnauthorizedException('Invalid TOTP');
    }

    await this.prisma.userMfa.update({
      where: { userId },
      data: {
        totpEnabled: true,
        totpVerifiedAt: new Date(),
      },
    });

    await this.tokenState.bumpAccessVersion();

    await this.auditLogger.log({
      action: 'MFA_TOTP_ENABLED',
      actorId: userId,
      entity: 'mfa',
    });

    return { enabled: true };
  }

  async verifyTotp(userId: string, code: string) {
    const rec = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!rec?.totpEnabled) {
      throw new BadRequestException('MFA not enabled');
    }

    await this.checkRateLimit();

    const ok = authenticator.check(code || '', rec.totpSecret || '');
    if (!ok) {
      await this.incrementAttempts();
      await this.auditLogger.log({
        action: 'MFA_TOTP_VERIFY_FAILED',
        actorId: userId,
        entity: 'mfa',
      });
      throw new UnauthorizedException('Invalid TOTP');
    }

    return { ok: true };
  }

  private async checkRateLimit(): Promise<void> {
    // Placeholder - would check attempt limits
  }

  private async incrementAttempts(): Promise<void> {
    // Placeholder - would increment attempts
  }

  async generateRecoveryKey(userId: string) {
    const has = await this.hasMfaEnabled(userId);
    if (!has) {
      throw new BadRequestException('MFA must be enabled first');
    }

    const key = randomBytes(MFA_CONFIG.RECOVERY_KEY_LENGTH).toString('hex');
    const keyHash = await bcrypt.hash(key, MFA_CONFIG.BCRYPT_ROUNDS);

    await this.prisma.userMfa.update({
      where: { userId },
      data: {
        recoveryKeyHash: keyHash,
        recoveryKeyUsedAt: null,
      },
    });

    await this.auditLogger.log({
      action: 'MFA_RECOVERY_KEY_GENERATED',
      actorId: userId,
      entity: 'mfa',
    });

    return { recoveryKey: key };
  }

  async disableMfaWithRecovery(userId: string, recoveryKey: string) {
    const rec = await this.prisma.userMfa.findUnique({
      where: { userId },
    });

    if (!rec?.totpEnabled) {
      throw new BadRequestException('MFA not enabled');
    }

    if (!rec.recoveryKeyHash) {
      throw new BadRequestException('No recovery key set');
    }

    if (rec.recoveryKeyUsedAt) {
      throw new BadRequestException('Recovery key already used');
    }

    const valid = await bcrypt.compare(
      recoveryKey || '',
      rec.recoveryKeyHash || '',
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid recovery key');
    }

    await this.prisma.userMfa.update({
      where: { userId },
      data: {
        totpEnabled: false,
        totpVerifiedAt: null,
        recoveryKeyUsedAt: new Date(),
      },
    });

    await this.tokenState.bumpAccessVersion();

    await this.auditLogger.log({
      action: 'MFA_DISABLED_WITH_RECOVERY',
      actorId: userId,
      entity: 'mfa',
    });

    return { disabled: true };
  }

  async disableTotp(userId: string, code?: string, backupCode?: string) {
    const rec = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!rec?.totpEnabled) {
      throw new BadRequestException('MFA not enabled');
    }

    let passed = false;
    if (code) {
      passed = authenticator.check(code || '', rec.totpSecret || '');
    }
    if (!passed && backupCode) {
      passed = await this.consumeBackupCode(userId, backupCode)
        .then(() => true)
        .catch(() => false);
    }
    if (!passed) {
      throw new UnauthorizedException('Verification required');
    }

    await this.prisma.userMfa.update({
      where: { userId },
      data: {
        totpEnabled: false,
        totpVerifiedAt: null,
      },
    });

    await this.tokenState.bumpAccessVersion();

    await this.auditLogger.log({
      action: 'MFA_DISABLED',
      actorId: userId,
      entity: 'mfa',
      meta: { method: code ? 'totp' : 'backup' },
    });

    return { disabled: true };
  }

  async generateBackupCodes(
    userId: string,
    count = MFA_CONFIG.BACKUP_CODE_COUNT,
  ) {
    const has = await this.hasMfaEnabled(userId);
    if (!has) {
      throw new BadRequestException('Enable MFA first');
    }

    const plain: string[] = [];
    const rows: { userMfaId: string; codeHash: string }[] = [];

    for (let i = 0; i < count; i++) {
      const code = this.randCode(MFA_CONFIG.BACKUP_CODE_LENGTH);
      const hash = await bcrypt.hash(code, MFA_CONFIG.BCRYPT_ROUNDS);
      plain.push(code);
      rows.push({ userMfaId: userId, codeHash: hash });
    }

    // Note: Requires schema fix - BackupCode.userMfaId should be FK to UserMfa
    // await this.prisma.backupCode.createMany({ data: rows });

    return { codes: plain };
  }

  async consumeBackupCode(userId: string, code: string) {
    const list = await this.prisma.backupCode.findMany({
      where: { usedAt: null },
      select: { id: true, codeHash: true },
    });

    for (const r of list) {
      const ok = await bcrypt.compare(code || '', r.codeHash || '');
      if (!ok) continue;

      const res = await this.prisma.backupCode.updateMany({
        where: { id: r.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      if (res.count === 1) {
        return { ok: true, consumedId: r.id };
      }
    }

    throw new UnauthorizedException('Invalid backup code');
  }

  private randCode(len = 10) {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < len; i++) s += abc[randomInt(0, abc.length)];
    return s;
  }
}
