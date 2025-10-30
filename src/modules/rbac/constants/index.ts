/**
 * 📋 RBAC Constants
 *
 * Central export point for all RBAC-related constants.
 * Use these for type-safe access to permissions and roles.
 */

export {
  Permissions,
  type PermissionValue,
  ALL_PERMISSIONS,
  getResourcePermissions,
  hasPermission,
  getPermissionName,
} from './permissions.constant';

export {
  Roles,
  type RoleValue,
  ALL_ROLES,
  hasRole,
  getRoleName,
  ROLE_HIERARCHY,
  isRoleHigherOrEqual,
} from './roles.constant';

export {
  type PermissionRecord,
  getPermissionRecords,
  type RolePermissionMap,
  getRolePermissionMappings,
  getPermissionsForRole,
} from './permission-mappings';
