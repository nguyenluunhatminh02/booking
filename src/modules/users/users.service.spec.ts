import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as cryptoUtil from '../../common/utils/crypto.util';
import { CreateUserDto } from './dto/create-user.dto';
import { appConfig } from '@/config/app/app.config';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService (unit)', () => {
  let service: UsersService;
  const mockPrisma: any = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const loggerMock = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: `PinoLogger:${UsersService.name}`, useValue: loggerMock },
        { provide: appConfig.KEY, useValue: { publicBaseUrl: 'https://test' } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should hash plaintext password on create', async () => {
    jest.spyOn(cryptoUtil, 'hashPassword').mockResolvedValue('hashed-pw');

    const dto: CreateUserDto = {
      email: 'u@example.com',
      password: 'plain1234',
      firstName: 'Jon',
      lastName: 'Doe',
      role: 'USER',
    } as unknown as CreateUserDto;

    mockPrisma.user.create.mockResolvedValue({
      id: '1',
      email: dto.email,
      password: 'hashed-pw',
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await service.create(dto);

    expect(cryptoUtil.hashPassword).toHaveBeenCalledWith('plain1234');
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(user).toBeDefined();
    expect((user as any).password).toBeUndefined();
  });

  it('should skip hashing when password already argon2-hashed', async () => {
    const dto: CreateUserDto = {
      email: 'u2@example.com',
      password: '$argon2$dummy',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'USER',
    } as unknown as CreateUserDto;

    jest.spyOn(cryptoUtil, 'hashPassword');

    mockPrisma.user.create.mockResolvedValue({
      id: '2',
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await service.create(dto);

    expect(cryptoUtil.hashPassword).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(user.email).toBe(dto.email);
  });

  it('findOne should return sanitized user or throw', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('not-exist')).rejects.toThrow();

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: '3',
      email: 'ok@example.com',
      password: 'hidden',
      firstName: 'A',
      lastName: 'B',
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.findOne('3');
    expect(result).toBeDefined();
    expect((result as any).password).toBeUndefined();
  });

  it('update should hash when plaintext and skip when already hashed', async () => {
    // Mock findOne to return a user (called by update to check if user exists)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: '4',
      email: 'e@example.com',
      password: '$argon2$old',
      firstName: 'X',
      lastName: 'Y',
      role: 'USER',
      isActive: true,
      emailVerified: false,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    jest.spyOn(cryptoUtil, 'hashPassword').mockResolvedValue('u-updated-hash');

    mockPrisma.user.update.mockResolvedValue({
      id: '4',
      email: 'e@example.com',
      password: 'u-updated-hash',
      firstName: 'X',
      lastName: 'Y',
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const updateDto = Object.assign(new UpdateUserDto(), {
      password: 'newpass123',
    });
    const res = await service.update('4', updateDto);
    expect(cryptoUtil.hashPassword).toHaveBeenCalledWith('newpass123');
    expect(res).toBeDefined();

    jest.spyOn(cryptoUtil, 'hashPassword').mockClear();
    mockPrisma.user.update.mockResolvedValueOnce({
      id: '4',
      email: 'e@example.com',
      password: '$argon2$already',
      firstName: 'X',
      lastName: 'Y',
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const updateDto2 = Object.assign(new UpdateUserDto(), {
      password: '$argon2$already',
    });
    const res2 = await service.update('4', updateDto2);
    expect(cryptoUtil.hashPassword).not.toHaveBeenCalled();
    expect(res2).toBeDefined();
  });

  it('countByRole should reduce groupBy result to map', async () => {
    mockPrisma.user.groupBy.mockResolvedValue([{ role: 'USER', _count: 5 }]);
    const counts = await service.countByRole();
    expect(counts.USER).toBe(5);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
