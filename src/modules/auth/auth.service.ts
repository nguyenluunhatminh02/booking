import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  comparePassword,
  hashPassword,
  generateToken,
  hashToken,
} from '@/common/utils';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { appConfig } from '@/config/app/app.config';
import { appendFileSync } from 'fs';
import { EmailService } from '@/common/services';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
  ) {}

  /**
   * Validate user credentials (used by LocalStrategy)
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const { password: storedPassword, ...result } = user;
    void storedPassword;
    return result;
  }

  /**
   * Login user
   */
  async login(dto: LoginDto) {
    this.logger.info(
      { email: dto.email, env: this.appCfg.nodeEnv },
      'User login attempt',
    );

    // Explicitly fetch full user with password and verify password against hash
    const userFull = await this.usersService.findByEmail(dto.email);

    if (!userFull) {
      this.logger.warn({ email: dto.email }, 'Invalid login credentials');
      throw new BadRequestException('Invalid email or password');
    }

    if (!userFull.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await comparePassword(
      dto.password,
      userFull.password,
    );
    if (!isPasswordValid) {
      this.logger.warn({ email: dto.email }, 'Invalid login credentials');
      throw new BadRequestException('Invalid email or password');
    }

    // Remove password before further processing/returning
    const { password: storedPassword, ...rest } = userFull;
    void storedPassword;
    const user = rest as Omit<User, 'password'>;

    // Update last login timestamp
    await this.usersService.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.info({ userId: user.id }, 'User logged in successfully');

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Register new user
   */
  async register(dto: RegisterDto) {
    this.logger.info({ email: dto.email }, 'User registration attempt');

    try {
      // Check if email already exists
      const existingUser = await this.usersService.findByEmail(dto.email);

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Parse name fields flexibly
      let firstName: string;
      let lastName: string;

      if (dto.name) {
        // Split full name into first and last
        const nameParts = dto.name.trim().split(/\s+/);
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ') || nameParts[0];
      } else {
        firstName = dto.firstName!;
        lastName = dto.lastName!;
      }

      // Hash password at registration to ensure safety before persistence
      const hashedPassword = await hashPassword(dto.password);

      // Create user (UsersService will detect hashed password and avoid re-hashing)
      const user = await this.usersService.create({
        email: dto.email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      // Generate verification token
      const verificationToken = generateToken(32);

      // Store verification token (hash it before storing)
      await this.prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(verificationToken),
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Send verification email
      await this.emailService.sendVerificationEmail(
        user.email,
        user.firstName,
        verificationToken,
      );

      // Send welcome email
      await this.emailService.sendWelcomeEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
      );

      this.logger.info(
        { userId: user.id },
        'User registered, verification email sent',
      );

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      return {
        user,
        ...tokens,
        verificationToken, // For testing purposes
      };
    } catch (error) {
      // Log structured error without sensitive values
      try {
        this.logger.error(
          {
            err: error,
            payload: {
              email: dto.email,
              firstName: dto.firstName,
              lastName: dto.lastName,
            },
          },
          'User registration failed',
        );
      } catch {
        // Fallback to console if logger fails
        // Avoid logging the password
        console.error('User registration failed', {
          error: error?.stack || error,
          payload: {
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        });
      }

      // Persist a redacted debug record on disk (do not log passwords)
      try {
        const record = {
          ts: new Date().toISOString(),
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          error: (error && (error.stack || String(error))) || 'unknown',
        };
        appendFileSync(
          'logs/register-errors.log',
          JSON.stringify(record) + '\n',
        );
      } catch (writeErr) {
        // best-effort — do not throw from logging

        console.error('Failed to write register debug log', writeErr);
      }

      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(
        dto.refreshToken,
        { secret: this.config.get<string>('JWT_REFRESH_SECRET') },
      );

      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          userId: payload.sub,
          tokenHash: hashToken(dto.refreshToken),
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user
      const user = await this.usersService.findOne(payload.sub);

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Revoke old refresh token and store new one
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      await this.storeRefreshToken(user.id, tokens.refreshToken);

      this.logger.info({ userId: user.id }, 'Token refreshed');

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke specific refresh token
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          tokenHash: hashToken(refreshToken),
        },
        data: {
          revokedAt: new Date(),
        },
      });
    } else {
      // Revoke all refresh tokens for user
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
    }

    this.logger.info({ userId }, 'User logged out');
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string) {
    const verificationToken = await this.prisma.verificationToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        type: 'EMAIL_VERIFICATION',
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Mark email as verified
    await this.usersService.verifyEmail(verificationToken.userId);

    // Mark token as used
    await this.prisma.verificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });

    this.logger.info({ userId: verificationToken.userId }, 'Email verified');

    return { message: 'Email verified successfully' };
  }

  /**
   * Request password reset
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If email exists, password reset link has been sent' };
    }

    // Generate reset token
    const resetToken = generateToken(32);

    // Store reset token (hash it before storing)
    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(resetToken),
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      },
    });

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
      resetToken,
    );

    this.logger.info({ userId: user.id }, 'Password reset requested');

    return {
      message: 'If email exists, password reset link has been sent',
      resetToken, // For testing purposes
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await this.prisma.verificationToken.findFirst({
      where: {
        tokenHash: hashToken(dto.token),
        type: 'PASSWORD_RESET',
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Get user info for email
    const user = await this.prisma.user.findUnique({
      where: { id: resetToken.userId },
    });

    // Update password (UsersService.update will hash the password)
    await this.usersService.update(resetToken.userId, {
      password: dto.password,
    });

    // Mark token as used
    await this.prisma.verificationToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId },
      data: { revokedAt: new Date() },
    });

    // Send password changed notification
    if (user) {
      await this.emailService.sendPasswordChangedEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
      );
    }

    this.logger.info(
      { userId: resetToken.userId },
      'Password reset successfully',
    );

    return { message: 'Password reset successfully' };
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify old password
    const isOldPasswordValid = await comparePassword(
      dto.currentPassword,
      user.password,
    );

    if (!isOldPasswordValid) {
      throw new BadRequestException('Invalid current password');
    }

    // Update password (UsersService.update will hash the password)
    await this.usersService.update(userId, {
      password: dto.newPassword,
    });

    // Send password changed notification
    await this.emailService.sendPasswordChangedEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
    );

    // Revoke all refresh tokens except current session
    // (Optional: keep current session active)

    this.logger.info({ userId }, 'Password changed successfully');

    return { message: 'Password changed successfully' };
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN') || '1d',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(userId: string, token: string) {
    const expiresIn = String(this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d');
    const expiresAt = this.parseExpiresIn(expiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
      },
    });
  }

  /**
   * Parse expires in string to Date
   */
  private parseExpiresIn(expiresIn: string): Date {
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiresIn format');
    }

    const [, value, unit] = match;
    const milliseconds = Number(value) * units[unit];

    return new Date(Date.now() + milliseconds);
  }
}
