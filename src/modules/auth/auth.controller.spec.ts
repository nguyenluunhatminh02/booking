import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

describe('AuthController (unit)', () => {
  let controller: AuthController;
  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call authService.login when login endpoint invoked', async () => {
    const dto = Object.assign(new LoginDto(), {
      email: 'a@b.com',
      password: 'P@ss1',
    });
    mockAuthService.login.mockResolvedValue({
      user: { id: 'u1' },
      accessToken: 'a',
      refreshToken: 'r',
    });

    const result = await controller.login(dto);
    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    expect(result.accessToken).toBeDefined();
  });

  it('should call register and return value', async () => {
    const dto = Object.assign(new RegisterDto(), {
      email: 'n@e.com',
      password: 'P@ss1234',
      name: 'Test User',
    });
    mockAuthService.register.mockResolvedValue({ user: { id: 'u2' } });

    const res = await controller.register(dto);
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    expect(res.user).toBeDefined();
  });

  it('should refresh tokens', async () => {
    const dto = Object.assign(new RefreshTokenDto(), { refreshToken: 'r' });
    mockAuthService.refreshToken.mockResolvedValue({ accessToken: 'a' });

    const res = await controller.refresh(dto);
    expect(mockAuthService.refreshToken).toHaveBeenCalledWith(dto);
    expect(res.accessToken).toBeDefined();
  });

  it('should logout user with refresh token', async () => {
    const req: any = { user: { id: 'u9' } };
    await controller.logout(req, { refreshToken: 'r' });
    expect(mockAuthService.logout).toHaveBeenCalledWith('u9', 'r');
  });
});
