import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersController (unit)', () => {
  let controller: UsersController;
  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    hardDelete: jest.fn(),
    verifyEmail: jest.fn(),
    countByRole: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create user', async () => {
    const dto = Object.assign(new CreateUserDto(), {
      email: 'a@b.com',
      password: 'P@ss1234!',
      firstName: 'A',
      lastName: 'B',
    });
    mockUsersService.create.mockResolvedValue({ id: 'u1' });
    const out = await controller.create(dto);
    expect(mockUsersService.create).toHaveBeenCalledWith(dto);
    expect(out.id).toBe('u1');
  });

  it('should get users with pagination', async () => {
    mockUsersService.findAll.mockResolvedValue({ data: [], meta: {} });
    const pagination = Object.assign(new PaginationDto(), {
      page: 1,
      limit: 10,
    });
    const out = await controller.findAll(pagination);
    expect(mockUsersService.findAll).toHaveBeenCalledWith(pagination);
    expect(out.data).toBeDefined();
  });

  it('should update, remove and verify email', async () => {
    mockUsersService.findOne.mockResolvedValue({ id: 'u2' });
    mockUsersService.update.mockResolvedValue({ id: 'u2' });
    mockUsersService.remove.mockResolvedValue(undefined);
    mockUsersService.hardDelete.mockResolvedValue(undefined);
    mockUsersService.verifyEmail.mockResolvedValue(undefined);

    await controller.update(
      'u2',
      Object.assign(new UpdateUserDto(), { firstName: 'X' }),
    );
    expect(mockUsersService.update).toHaveBeenCalledWith(
      'u2',
      expect.anything(),
    );

    await controller.remove('u2');
    expect(mockUsersService.remove).toHaveBeenCalledWith('u2');

    await controller.hardDelete('u2');
    expect(mockUsersService.hardDelete).toHaveBeenCalledWith('u2');

    await controller.verifyEmail('u2');
    expect(mockUsersService.verifyEmail).toHaveBeenCalledWith('u2');
  });
});
