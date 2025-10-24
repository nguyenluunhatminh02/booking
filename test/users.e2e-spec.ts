import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { INestApplication } from '@nestjs/common';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import * as cryptoUtil from '../src/common/utils/crypto.util';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  const mockUsersService: Partial<UsersService> = {
    create: jest.fn(),
    findAll: jest.fn(),
    countByRole: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    hardDelete: jest.fn(),
    verifyEmail: jest.fn(),
  };

  // Use valid UUIDs for testing
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';

  beforeAll(async () => {
    jest.spyOn(cryptoUtil, 'hashPassword').mockResolvedValue('hashed-pw');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
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

  it('POST /users should create a user', async () => {
    (mockUsersService.create as jest.Mock).mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
    });

    const resp = await request(app.getHttpServer() as unknown as App)
      .post('/users')
      .send({
        email: 'a@b.com',
        password: 'P@ssword1',
        firstName: 'A',
        lastName: 'B',
      })
      .expect(201);

    expect(resp.body.email).toBe('a@b.com');
  });

  it('GET /users should return paginated list', async () => {
    (mockUsersService.findAll as jest.Mock).mockResolvedValueOnce({
      data: [{ id: 'u1', email: 'a' }],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
    const resp = await request(app.getHttpServer() as unknown as App)
      .get('/users')
      .expect(200);

    expect(resp.body.data).toBeDefined();
    expect(resp.body.meta.total).toBe(1);
  });

  it('GET /users/:id should return user', async () => {
    (mockUsersService.findOne as jest.Mock).mockResolvedValueOnce({
      id: testUserId,
      email: 'b@c.com',
    });
    const resp = await request(app.getHttpServer() as unknown as App)
      .get(`/users/${testUserId}`)
      .expect(200);

    expect(resp.body.email).toBe('b@c.com');
  });

  it('PATCH /users/:id should update user', async () => {
    (mockUsersService.update as jest.Mock).mockResolvedValueOnce({
      id: testUserId,
      email: 'updated@c.com',
    });
    const resp = await request(app.getHttpServer() as unknown as App)
      .patch(`/users/${testUserId}`)
      .send({
        firstName: 'Updated',
      })
      .expect(200);

    expect(resp.body.email).toBe('updated@c.com');
  });

  it('DELETE /users/:id should soft delete (204)', async () => {
    (mockUsersService.remove as jest.Mock).mockResolvedValueOnce(undefined);
    await request(app.getHttpServer() as unknown as App)
      .delete(`/users/${testUserId}`)
      .expect(204);
  });

  it('DELETE /users/:id/hard should hard delete (204)', async () => {
    (mockUsersService.hardDelete as jest.Mock).mockResolvedValueOnce(undefined);
    await request(app.getHttpServer() as unknown as App)
      .delete(`/users/${testUserId}/hard`)
      .expect(204);
  });

  it('POST /users/:id/verify-email should return ok', async () => {
    (mockUsersService.verifyEmail as jest.Mock).mockResolvedValueOnce(
      undefined,
    );
    const resp = await request(app.getHttpServer() as unknown as App)
      .post(`/users/${testUserId}/verify-email`)
      .expect(200);

    expect(resp.body.message).toBe('Email verified successfully');
  });
});
