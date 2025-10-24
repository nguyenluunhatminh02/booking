import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../common/services/email.service';
import { PinoLogger } from 'nestjs-pino';
import * as cryptoUtil from '../../common/utils/crypto.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { appConfig } from '@/config/app/app.config';

describe('AuthService (unit)', () => {
  let service: AuthService;

  const mockUsers = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPrisma: any = {
    refreshToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    verificationToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockJwt = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfig = { get: jest.fn().mockReturnValue('1d') };
  const mockEmail = {
    sendVerificationEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendPasswordChangedEmail: jest.fn(),
  };
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsers },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: EmailService, useValue: mockEmail },
        { provide: `PinoLogger:${AuthService.name}`, useValue: mockLogger },
        {
          provide: appConfig.KEY,
          useValue: { nodeEnv: 'test', publicBaseUrl: 'https://test' },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('returns null when user not found', async () => {
      mockUsers.findByEmail.mockResolvedValueOnce(null);
      const res = await service.validateUser('x@x.com', 'pw');
      expect(res).toBeNull();
    });

    it('returns sanitized user when valid', async () => {
      const user = {
        id: 'u1',
        email: 'x',
        password: 'h',
        isActive: true,
      } as unknown as any;
      mockUsers.findByEmail.mockResolvedValueOnce(user);
      jest.spyOn(cryptoUtil, 'comparePassword').mockResolvedValue(true);
      const res = await service.validateUser('x', 'pw');
      expect(res).toBeDefined();
      expect(res).not.toHaveProperty('password');
    });
  });

  describe('login', () => {
    it('throws BadRequest on invalid credentials', async () => {
      mockUsers.findByEmail.mockResolvedValueOnce(null);
      await expect(
        service.login(
          (() => {
            const d = new LoginDto();
            d.email = 'a';
            d.password = 'b';
            return d;
          })(),
        ),
      ).rejects.toThrow();
    });

    it('returns tokens on success and stores refresh token', async () => {
      const userFull: any = {
        id: 'u2',
        email: 'ok',
        password: 'h',
        isActive: true,
        role: 'USER',
      };
      mockUsers.findByEmail.mockResolvedValueOnce(userFull);
      jest.spyOn(cryptoUtil, 'comparePassword').mockResolvedValue(true);
      mockJwt.signAsync.mockResolvedValueOnce('access-token');
      mockJwt.signAsync.mockResolvedValueOnce('refresh-token');
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt1' });

      const res = await service.login(
        (() => {
          const d = new LoginDto();
          d.email = 'ok';
          d.password = 'pw';
          return d;
        })(),
      );
      expect(res.accessToken).toBeDefined();
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
      expect(mockUsers.updateLastLogin).toHaveBeenCalledWith('u2');
    });
  });

  describe('register', () => {
    it('throws ConflictException when email exists', async () => {
      mockUsers.findByEmail.mockResolvedValueOnce({ id: 'u' });
      await expect(
        service.register(
          (() => {
            const d = new RegisterDto();
            d.email = 'x';
            d.password = 'p';
            return d;
          })(),
        ),
      ).rejects.toThrow();
    });

    it('creates user, sends emails and stores tokens', async () => {
      mockUsers.findByEmail.mockResolvedValueOnce(null);
      jest.spyOn(cryptoUtil, 'hashPassword').mockResolvedValue('hk');
      const createdUser = {
        id: 'nu',
        email: 'n@example.com',
        firstName: 'A',
        lastName: 'B',
      };
      mockUsers.create.mockResolvedValueOnce(createdUser);
      jest.spyOn(cryptoUtil, 'generateToken').mockReturnValue('verify-token');
      mockPrisma.verificationToken.create.mockResolvedValue({ id: 'vt' });
      mockJwt.signAsync.mockResolvedValueOnce('acc');
      mockJwt.signAsync.mockResolvedValueOnce('ref');
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt' });

      const out = await service.register(
        (() => {
          const d = new RegisterDto();
          d.email = 'n@example.com';
          d.password = 'p';
          return d;
        })(),
      );
      expect(cryptoUtil.hashPassword).toHaveBeenCalled();
      expect(mockUsers.create).toHaveBeenCalled();
      expect(mockEmail.sendVerificationEmail).toHaveBeenCalled();
      expect(out.accessToken).toBeDefined();
    });
  });

  describe('refreshToken', () => {
    it('throws on invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('bad');
      });
      await expect(
        service.refreshToken(
          (() => {
            const d = new RefreshTokenDto();
            d.refreshToken = 'bad';
            return d;
          })(),
        ),
      ).rejects.toThrow();
    });

    it('refreshes tokens when valid', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'u3' } as any);
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt',
        userId: 'u3',
      });
      mockUsers.findOne.mockResolvedValueOnce({
        id: 'u3',
        email: 'u3@example.com',
        role: 'USER',
      } as any);
      mockJwt.signAsync.mockResolvedValueOnce('newacc');
      mockJwt.signAsync.mockResolvedValueOnce('newref');

      const tokens = await service.refreshToken(
        (() => {
          const d = new RefreshTokenDto();
          d.refreshToken = 'ok';
          return d;
        })(),
      );
      expect(tokens.accessToken).toBeDefined();
      expect(mockPrisma.refreshToken.update).toHaveBeenCalled();
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('forgot/reset/change password flows', () => {
    it('forgotPassword returns message whether user exists or not', async () => {
      mockUsers.findByEmail.mockResolvedValueOnce(null);
      const r1 = await service.forgotPassword(
        (() => {
          const d = new ForgotPasswordDto();
          d.email = 'no';
          return d;
        })(),
      );
      expect(r1.message).toBeDefined();

      mockUsers.findByEmail.mockResolvedValueOnce({
        id: 'u4',
        email: 'u4',
      } as any);
      mockPrisma.verificationToken.create.mockResolvedValue({ id: 'vt1' });
      await service.forgotPassword(
        (() => {
          const d = new ForgotPasswordDto();
          d.email = 'u4';
          return d;
        })(),
      );
      expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('resetPassword throws when token invalid and succeeds when valid', async () => {
      mockPrisma.verificationToken.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.resetPassword(
          (() => {
            const d = new ResetPasswordDto();
            d.token = 'no';
            d.password = 'p';
            d.confirmPassword = 'p';
            return d;
          })(),
        ),
      ).rejects.toThrow();

      mockPrisma.verificationToken.findFirst.mockResolvedValueOnce({
        id: 'vt',
        userId: 'u5',
      } as any);
      mockPrisma.verificationToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.updateMany.mockResolvedValue({});
      mockUsers.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'u5' } as any);
      const ok = await service.resetPassword(
        (() => {
          const d = new ResetPasswordDto();
          d.token = 'ok';
          d.password = 'p';
          d.confirmPassword = 'p';
          return d;
        })(),
      );
      expect(ok).toBeDefined();
    });

    it('changePassword validates and updates password', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u6',
        password: 'hash',
      } as any);
      jest.spyOn(cryptoUtil, 'comparePassword').mockResolvedValue(true);
      mockUsers.update.mockResolvedValue({});
      mockEmail.sendPasswordChangedEmail.mockResolvedValue(undefined);
      const msg = await service.changePassword(
        'u6',
        (() => {
          const d = new ChangePasswordDto();
          d.currentPassword = 'a';
          d.newPassword = 'b';
          return d;
        })(),
      );
      expect(msg).toBeDefined();
      expect(mockUsers.update).toHaveBeenCalled();
    });
  });
});
