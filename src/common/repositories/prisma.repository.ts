// src/common/repositories/prisma.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IRepository } from './base.repository';

/**
 * Prisma-based repository implementation
 * Works with any Prisma model
 */
@Injectable()
export class PrismaRepository<T, CreateInput, UpdateInput>
  implements IRepository<T, CreateInput, UpdateInput>
{
  constructor(
    private prisma: PrismaService,
    private modelName: keyof typeof this.prisma,
  ) {}

  async findById(id: string): Promise<T | null> {
    const model = this.prisma[this.modelName] as any;
    return await model.findUnique({
      where: { id },
    });
  }

  async findAll(filters?: Record<string, any>): Promise<T[]> {
    const where = this.buildWhereClause(filters);
    const model = this.prisma[this.modelName] as any;
    return await model.findMany({ where });
  }

  async findWithPagination(
    page: number,
    limit: number,
    filters?: Record<string, any>,
  ): Promise<{ data: T[]; total: number }> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;
    const model = this.prisma[this.modelName] as any;

    const [data, total] = await Promise.all([
      await model.findMany({
        where,
        skip,
        take: limit,
      }),
      await model.count({ where }),
    ]);

    return { data, total };
  }

  async exists(id: string): Promise<boolean> {
    const model = this.prisma[this.modelName] as any;
    const result = await model.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!result;
  }

  async create(input: CreateInput): Promise<T> {
    const model = this.prisma[this.modelName] as any;
    return await model.create({
      data: input,
    });
  }

  async update(id: string, input: UpdateInput): Promise<T | null> {
    try {
      const model = this.prisma[this.modelName] as any;
      return await model.update({
        where: { id },
        data: input,
      });
    } catch {
      // Record not found
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const model = this.prisma[this.modelName] as any;
      await model.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      const model = this.prisma[this.modelName] as any;
      await model.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  async restore(id: string): Promise<boolean> {
    try {
      const model = this.prisma[this.modelName] as any;
      await model.update({
        where: { id },
        data: { deletedAt: null },
      });
      return true;
    } catch {
      return false;
    }
  }

  async count(filters?: Record<string, any>): Promise<number> {
    const where = this.buildWhereClause(filters);
    const model = this.prisma[this.modelName] as any;
    return await model.count({ where });
  }

  async findOne(where: Record<string, any>): Promise<T | null> {
    const model = this.prisma[this.modelName] as any;
    return await model.findFirst({
      where,
    });
  }

  async query<R>(callback: () => Promise<R>): Promise<R> {
    return callback();
  }

  /**
   * Build WHERE clause from filters
   * Automatically filters out soft-deleted records
   */
  private buildWhereClause(filters?: Record<string, any>): Record<string, any> {
    const where = { ...filters };

    // Auto-exclude soft-deleted unless explicitly requested
    if (!where.deletedAt && !('deletedAt' in where)) {
      where.deletedAt = null;
    }

    return where;
  }
}
