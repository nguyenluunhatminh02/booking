import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigType } from '@nestjs/config';
import { appConfig } from '@/config/app/app.config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hashPassword } from '@/common/utils';
import { Prisma, User, SystemRole } from '@prisma/client';
import { PaginationDto } from '@/common/dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(UsersService.name)
    private readonly logger: PinoLogger,
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
  ) {}

  /**
   * Create a new user
   */
  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    this.logger.info({ email: dto.email }, 'Creating user');

    // Hash password before storing only if it's not already hashed
    const raw = dto.password;
    const passwordToStore =
      typeof raw === 'string' && raw.startsWith('$argon2')
        ? raw
        : await hashPassword(raw);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: passwordToStore,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role ?? SystemRole.USER,
        isActive: true,
      },
    });

    this.logger.info({ userId: user.id, email: user.email }, 'User created');
    // Include app-level info for observability
    this.logger.debug(
      { publicBaseUrl: this.appCfg.publicBaseUrl },
      'App public base URL',
    );

    // Remove password from response
    const { password, ...result } = user;
    void password;
    return result;
  }

  /**
   * Find all users with pagination
   */
  async findAll(pagination: PaginationDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find user by ID
   */
  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, ...result } = user;
    void password;
    return result;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Update user
   */
  async update(
    id: string,
    dto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    this.logger.info({ userId: id }, 'Updating user');

    // Check if user exists
    await this.findOne(id);

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.email) updateData.email = dto.email;
    if (dto.firstName) updateData.firstName = dto.firstName;
    if (dto.lastName) updateData.lastName = dto.lastName;
    if (dto.role) updateData.role = dto.role;
    if (dto.password) {
      updateData.password =
        typeof dto.password === 'string' && dto.password.startsWith('$argon2')
          ? dto.password
          : await hashPassword(dto.password);
    }
    if (typeof dto.isActive !== 'undefined') {
      updateData.isActive = dto.isActive;
    }
    if (typeof dto.emailVerified !== 'undefined') {
      updateData.emailVerified = dto.emailVerified;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    this.logger.info({ userId: id }, 'User updated');

    const { password, ...result } = user;
    void password;
    return result;
  }

  /**
   * Soft delete user (set isActive to false)
   */
  async remove(id: string): Promise<void> {
    this.logger.info({ userId: id }, 'Soft deleting user');

    await this.findOne(id); // Check if exists

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.info({ userId: id }, 'User soft deleted');
  }

  /**
   * Hard delete user (permanent)
   */
  async hardDelete(id: string): Promise<void> {
    this.logger.warn({ userId: id }, 'Hard deleting user');

    await this.findOne(id); // Check if exists

    await this.prisma.user.delete({
      where: { id },
    });

    this.logger.warn({ userId: id }, 'User permanently deleted');
  }

  /**
   * Verify user email
   */
  async verifyEmail(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { emailVerified: true },
    });

    this.logger.info({ userId: id }, 'Email verified');
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Get user count by role
   */
  async countByRole(): Promise<Record<string, number>> {
    const counts = await this.prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    return counts.reduce(
      (acc, curr) => {
        acc[curr.role] = curr._count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
