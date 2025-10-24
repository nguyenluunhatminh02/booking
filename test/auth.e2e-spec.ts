import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import * as cryptoUtil from '../src/common/utils/crypto.util';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const mockAuthService: Partial<AuthService> = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeAll(async () => {
    // Avoid performing real argon2 hashing/verification in e2e tests
    jest.spyOn(cryptoUtil, 'hashPassword').mockResolvedValue('hashed-pw');
    jest.spyOn(cryptoUtil, 'comparePassword').mockResolvedValue(true);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'u1', email: 'a@b.com', role: 'USER' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    jest.restoreAllMocks();
  });

  it('/auth/register (POST) should register user and return created user', async () => {
    const created = {
      id: 'u1',
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
    };

    (mockAuthService.register as jest.Mock).mockResolvedValueOnce({
      user: created,
      accessToken: 'at',
      refreshToken: 'rt',
    });

    const resp = await request(app.getHttpServer() as unknown as App)
      .post('/auth/register')
      .send({
        email: 'a@b.com',
        password: 'Password123!',
        name: 'A B',
      })
      .expect(201);

    expect(resp.body.user).toBeDefined();
    expect(resp.body.user.email).toBe('a@b.com');
  });

  it('/auth/login (POST) should return tokens on valid credentials', async () => {
    (mockAuthService.login as jest.Mock).mockResolvedValueOnce({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'u1', email: 'a@b.com' },
    });

    const resp = await request(app.getHttpServer() as unknown as App)
      .post('/auth/login')
      .send({
        email: 'a@b.com',
        password: 'Password123!',
      })
      .expect(200);

    expect(resp.body.accessToken).toBeDefined();
    expect(resp.body.refreshToken).toBeDefined();
  });

  it('/auth/refresh (POST) should refresh tokens', async () => {
    (mockAuthService.refreshToken as jest.Mock).mockResolvedValueOnce({
      accessToken: 'new-at',
      refreshToken: 'new-rt',
    });

    const resp = await request(app.getHttpServer() as unknown as App)
      .post('/auth/refresh')
      .send({
        refreshToken: 'refresh',
      })
      .expect(200);

    expect(resp.body.accessToken).toBeDefined();
  });

  it('/auth/me (GET) should return current user when authenticated', async () => {
    const resp = await request(app.getHttpServer() as unknown as App)
      .get('/auth/me')
      // Jwt guard was overridden to allow access
      .expect(200);

    expect(resp.body).toBeDefined();
  });
});
