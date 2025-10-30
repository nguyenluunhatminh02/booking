// src/common/repositories/index.ts

export { IRepository, IRepositoryFactory } from './base.repository';
export { PrismaRepository } from './prisma.repository';
export { RepositoryProvider, REPOSITORIES } from './repository.provider';
