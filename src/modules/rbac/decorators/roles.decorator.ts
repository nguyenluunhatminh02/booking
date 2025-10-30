import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator để check role-based authorization
 * Usage: @Roles('admin', 'moderator')
 *
 * User must have AT LEAST ONE of the specified roles
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
