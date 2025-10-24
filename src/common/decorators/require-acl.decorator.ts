import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ACL_KEY = 'acl_require';

export interface AclRequirement {
  resourceType: string;
  resourceIdParam?: string; // Param name to extract resource ID from request
  action: string;
}

/**
 * Decorator để yêu cầu quyền ACL trên một resource
 *
 * @example
 * @RequireAcl({
 *   resourceType: 'Booking',
 *   resourceIdParam: 'id',
 *   action: 'edit'
 * })
 * async updateBooking(@Param('id') id: string) {}
 */
export const RequireAcl = (requirement: AclRequirement) =>
  SetMetadata(REQUIRE_ACL_KEY, requirement);
