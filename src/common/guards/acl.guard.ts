import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AclService } from '@/modules/acl/acl.service';
import {
  REQUIRE_ACL_KEY,
  AclRequirement,
} from '../decorators/require-acl.decorator';

@Injectable()
export class AclGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private aclService: AclService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy metadata từ decorator
    const requirement = this.reflector.get<AclRequirement>(
      REQUIRE_ACL_KEY,
      context.getHandler(),
    );

    // Nếu không có @RequireAcl decorator, cho phép
    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Lấy resource ID từ request
    const resourceId = this.extractResourceId(requirement, request);

    if (!resourceId) {
      throw new BadRequestException(
        `Resource ID not found in request (param: ${requirement.resourceIdParam})`,
      );
    }

    // Check ACL
    const hasAccess = await this.aclService.checkAccess({
      userId: user.id,
      resourceType: requirement.resourceType,
      resourceId,
      action: requirement.action,
    });

    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied to ${requirement.action} ${requirement.resourceType}/${resourceId}`,
      );
    }

    return true;
  }

  /**
   * Lấy resource ID từ request params, query, hoặc body
   */
  private extractResourceId(
    requirement: AclRequirement,
    request: any,
  ): string | null {
    if (!requirement.resourceIdParam) {
      return null;
    }

    const paramName = requirement.resourceIdParam;

    // Tìm trong params
    if (request.params && request.params[paramName]) {
      return request.params[paramName];
    }

    // Tìm trong query
    if (request.query && request.query[paramName]) {
      return request.query[paramName];
    }

    // Tìm trong body
    if (request.body && request.body[paramName]) {
      return request.body[paramName];
    }

    return null;
  }
}
