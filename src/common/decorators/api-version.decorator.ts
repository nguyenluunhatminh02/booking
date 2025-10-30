// src/common/decorators/api-version.decorator.ts

import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark API endpoint version
 * @example
 * @ApiVersion('1.0')
 * @Get('users')
 * async getUsers() { }
 */
export const API_VERSION_METADATA = 'api_version';

export function ApiVersion(version: string) {
  return SetMetadata(API_VERSION_METADATA, version);
}

/**
 * Decorator for deprecated endpoints
 * Will show warning in Swagger docs
 * @example
 * @Deprecated('Use /api/v2/users instead')
 * @Get('users')
 * async getUsers() { }
 */
export const DEPRECATED_METADATA = 'deprecated';

export function Deprecated(message?: string) {
  return SetMetadata(
    DEPRECATED_METADATA,
    message || 'This endpoint is deprecated',
  );
}

/**
 * Decorator for stability level
 * @example
 * @Stability('experimental')
 * @Get('features/new-thing')
 * async getNewFeature() { }
 */
export const STABILITY_METADATA = 'stability';

export type StabilityLevel = 'stable' | 'beta' | 'experimental' | 'deprecated';

export function Stability(level: StabilityLevel) {
  return SetMetadata(STABILITY_METADATA, level);
}
