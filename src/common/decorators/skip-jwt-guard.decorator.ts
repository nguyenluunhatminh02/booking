// common/decorators/skip-jwt-guard.decorator.ts
import { SetMetadata } from '@nestjs/common';

/**
 * Decorator để skip JWT guard (tương đương @Public())
 * Sử dụng khi muốn route không cần authentication
 */
export const SKIP_GLOBAL_JWT_GUARD = 'SKIP_GLOBAL_JWT_GUARD';

export const SkipJwtGuard = () => SetMetadata(SKIP_GLOBAL_JWT_GUARD, true);

// Alias cho @Public()
export const IS_SKIP_GLOBAL_JWT_GUARD = SkipJwtGuard;
