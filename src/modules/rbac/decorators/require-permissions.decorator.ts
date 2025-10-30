import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_MODE_KEY = 'permissions:mode';

export const RequirePermissions = (
  permissions: string[],
  mode: 'all' | 'any' = 'all',
) => {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    if (key !== undefined && descriptor !== undefined) {
      SetMetadata(PERMISSIONS_KEY, permissions)(target, key, descriptor);
      SetMetadata(PERMISSIONS_MODE_KEY, mode)(target, key, descriptor);
    }
  };
};
