// src/common/repositories/base.repository.ts

/**
 * Generic repository interface for data access abstraction
 * Decouples service layer from database implementation
 */
export interface IRepository<T, CreateInput, UpdateInput> {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities with optional filtering
   */
  findAll(filters?: Record<string, any>): Promise<T[]>;

  /**
   * Find with pagination
   */
  findWithPagination(
    page: number,
    limit: number,
    filters?: Record<string, any>,
  ): Promise<{ data: T[]; total: number }>;

  /**
   * Check if entity exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Create new entity
   */
  create(input: CreateInput): Promise<T>;

  /**
   * Update entity
   */
  update(id: string, input: UpdateInput): Promise<T | null>;

  /**
   * Delete entity (hard delete)
   */
  delete(id: string): Promise<boolean>;

  /**
   * Soft delete (logical deletion)
   */
  softDelete(id: string): Promise<boolean>;

  /**
   * Restore soft-deleted entity
   */
  restore(id: string): Promise<boolean>;

  /**
   * Count entities
   */
  count(filters?: Record<string, any>): Promise<number>;

  /**
   * Find with custom where clause
   */
  findOne(where: Record<string, any>): Promise<T | null>;

  /**
   * Execute raw query (escape hatch for complex queries)
   */
  query<R>(callback: () => Promise<R>): Promise<R>;
}

/**
 * Repository factory for dependency injection
 */
export interface IRepositoryFactory {
  getRepository<T, C, U>(model: string): IRepository<T, C, U>;
}
