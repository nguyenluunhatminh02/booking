// common/guards/roles.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!user) return false;
    // Support both legacy `role: string` and `roles: string[]` shapes
    const userRoles: string[] = Array.isArray(user.roles)
      ? user.roles
      : typeof user.role === 'string'
        ? [user.role]
        : [];
    return required.some((r) => userRoles.includes(r));
  }
}
