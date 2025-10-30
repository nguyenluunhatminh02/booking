import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import { PERMISSIONS_KEY, PERMISSIONS_MODE_KEY } from '../decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly log = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get @RequirePermissions() metadata
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || !required.length) {
      return true; // No permissions required
    }

    const mode = this.reflector.getAllAndOverride<'all' | 'any'>(
      PERMISSIONS_MODE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user?.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract resource info from route params (if available)
    const resourceType = this.extractResourceType(req);
    const resourceId = req.params?.id || req.params?.resourceId;
    const ownsResource = this.checkOwnership(req, user.id);

    // Check permissions
    const result = await this.rbac.checkPermissions({
      userId: user.id,
      required,
      mode: mode || 'all',
      resourceType,
      resourceId,
      ownsResource,
    });

    if (!result.allowed) {
      this.log.warn(`Permission denied for user ${user.id}: ${result.reason}`);
      throw new ForbiddenException(result.reason);
    }

    return true;
  }

  private extractResourceType(req: any): string | undefined {
    // Extract from route: /api/bookings/:id -> "booking"
    const path = req.route?.path || req.url;
    const match = path.match(/\/api\/([^/]+)/);
    if (match) {
      const resource = match[1];
      // Singularize: bookings -> booking
      return resource.endsWith('s') ? resource.slice(0, -1) : resource;
    }
    return undefined;
  }

  private checkOwnership(req: any, userId: string): boolean {
    // Check if user owns the resource
    // Strategy 1: req.params.userId matches current user
    if (req.params?.userId === userId) return true;

    // Strategy 2: Check if resource was created by user (would need to query DB)
    // For now, return false - can be enhanced later
    return false;
  }
}
