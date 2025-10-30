// src/common/repositories/repository.provider.ts

import { Provider } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaRepository } from './prisma.repository';

/**
 * Factory to create repository providers
 * Usage: RepositoryProvider.create('User', CreateUserDto, UpdateUserDto)
 */
export class RepositoryProvider {
  /**
   * Create a repository provider for dependency injection
   *
   * @example
   * providers: [
   *   RepositoryProvider.create('User', CreateUserDto, UpdateUserDto),
   *   RepositoryProvider.create('Booking', CreateBookingDto, UpdateBookingDto),
   * ]
   */
  static create<T, CreateInput, UpdateInput>(modelName: string): Provider {
    return {
      provide: `I${modelName}Repository`,
      useFactory: (prisma: PrismaService) => {
        return new PrismaRepository<T, CreateInput, UpdateInput>(
          prisma,
          modelName as any,
        );
      },
      inject: [PrismaService],
    };
  }

  /**
   * Create multiple repositories at once
   *
   * @example
   * providers: [
   *   ...RepositoryProvider.createMany([
   *     { model: 'User', create: CreateUserDto, update: UpdateUserDto },
   *     { model: 'Booking', create: CreateBookingDto, update: UpdateBookingDto },
   *   ]),
   * ]
   */
  static createMany(
    configs: Array<{ model: string; create?: any; update?: any }>,
  ): Provider[] {
    return configs.map((config) => this.create(config.model));
  }
}

/**
 * Injection tokens for repositories
 * Use with @Inject()
 */
export const REPOSITORIES = {
  USER: 'IUserRepository',
  BOOKING: 'IBookingRepository',
  PAYMENT: 'IPaymentRepository',
  PERMISSION: 'IPermissionRepository',
  ROLE: 'IRoleRepository',
  SESSION: 'ISessionRepository',
  AUDIT_LOG: 'IAuditLogRepository',
} as const;
