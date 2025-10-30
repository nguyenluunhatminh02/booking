import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';

export const ROLES_KEY = 'roles';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly log = new Logger(RoleGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || !requiredRoles.length) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user?.id) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRoles = await this.rbac.getUserRoles(user.id);

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      this.log.warn(
        `Role check failed for user ${user.id}. Required: ${requiredRoles.join(', ')}, Has: ${userRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
