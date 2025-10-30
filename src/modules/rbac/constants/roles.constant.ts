/**
 * 👥 RBAC Roles Constants
 *
 * Type-safe constants for all roles in the system.
 * Use these instead of hardcoding strings to avoid typos and enable IDE autocomplete.
 *
 * @example
 * @Roles(Roles.ADMIN)
 * @Roles(Roles.ADMIN, Roles.MODERATOR)
 */

export const Roles = {
  /** System administrator - full access to all resources */
  ADMIN: 'admin',
  /** Content moderator - can manage content and moderate users */
  MODERATOR: 'moderator',
  /** Regular user - limited access to own resources */
  USER: 'user',
} as const;

/**
 * Type for Role values
 */
export type RoleValue = (typeof Roles)[keyof typeof Roles];

/**
 * Array of all roles
 * Useful for listing or validating roles
 */
export const ALL_ROLES: RoleValue[] = [
  Roles.ADMIN,
  Roles.MODERATOR,
  Roles.USER,
];

/**
 * Check if a role exists
 * @example hasRole('admin') // true
 */
export function hasRole(role: string): boolean {
  return ALL_ROLES.includes(role as RoleValue);
}

/**
 * Get role name
 * @example getRoleName(Roles.ADMIN) // 'admin'
 */
export function getRoleName(role: RoleValue): string {
  return role;
}

/**
 * Role Hierarchy (for future implementation of role inheritance)
 * Higher level roles inherit permissions from lower levels
 */
export const ROLE_HIERARCHY: Record<RoleValue, number> = {
  [Roles.ADMIN]: 100,
  [Roles.MODERATOR]: 50,
  [Roles.USER]: 10,
};

/**
 * Check if a role is higher or equal to another
 * @example isRoleHigherOrEqual(Roles.ADMIN, Roles.USER) // true
 */
export function isRoleHigherOrEqual(
  roleA: RoleValue,
  roleB: RoleValue,
): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}
