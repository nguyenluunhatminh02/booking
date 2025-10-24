// common/decorators/skip-transform.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { SKIP_TRANSFORM } from '../interceptors/transform.interceptor';

/**
 * Decorator để skip Transform Interceptor
 * Sử dụng khi muốn trả về raw response không bị wrap
 *
 * @example
 * @Get('health')
 * @SkipTransform()
 * getHealth() {
 *   return { status: 'ok' };
 * }
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM, true);
