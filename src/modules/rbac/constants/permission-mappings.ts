/**
 * 🔄 Permission Mappings & Helpers
 *
 * Helper functions to convert TypeScript constants to database format
 * and manage permission seeding.
 */

import { Permissions } from './permissions.constant';

/**
 * Database permission format
 */
export interface PermissionRecord {
  name: string;
  action: string;
  subject: string;
  desc: string;
}

/**
 * Convert Permissions constant to database format
 * @example
 * const dbPermissions = getPermissionRecords();
 * // Returns array of { name, action, subject, desc } objects
 */
export function getPermissionRecords(): PermissionRecord[] {
  return [
    // User permissions
    {
      name: Permissions.USER.READ,
      action: 'read',
      subject: 'user',
      desc: 'View user details',
    },
    {
      name: Permissions.USER.CREATE,
      action: 'create',
      subject: 'user',
      desc: 'Create new users',
    },
    {
      name: Permissions.USER.UPDATE,
      action: 'update',
      subject: 'user',
      desc: 'Update user details',
    },
    {
      name: Permissions.USER.DELETE,
      action: 'delete',
      subject: 'user',
      desc: 'Delete users',
    },

    // Booking permissions
    {
      name: Permissions.BOOKING.READ,
      action: 'read',
      subject: 'booking',
      desc: 'View bookings',
    },
    {
      name: Permissions.BOOKING.CREATE,
      action: 'create',
      subject: 'booking',
      desc: 'Create bookings',
    },
    {
      name: Permissions.BOOKING.UPDATE,
      action: 'update',
      subject: 'booking',
      desc: 'Update bookings',
    },
    {
      name: Permissions.BOOKING.DELETE,
      action: 'delete',
      subject: 'booking',
      desc: 'Delete bookings',
    },
    {
      name: Permissions.BOOKING.CONFIRM,
      action: 'confirm',
      subject: 'booking',
      desc: 'Confirm bookings',
    },
    {
      name: Permissions.BOOKING.CANCEL,
      action: 'cancel',
      subject: 'booking',
      desc: 'Cancel bookings',
    },
    {
      name: Permissions.BOOKING.REFUND,
      action: 'refund',
      subject: 'booking',
      desc: 'Process refunds',
    },

    // File permissions
    {
      name: Permissions.FILE.READ,
      action: 'read',
      subject: 'file',
      desc: 'View/download files',
    },
    {
      name: Permissions.FILE.UPLOAD,
      action: 'upload',
      subject: 'file',
      desc: 'Upload files',
    },
    {
      name: Permissions.FILE.DELETE,
      action: 'delete',
      subject: 'file',
      desc: 'Delete files',
    },

    // Role permissions
    {
      name: Permissions.ROLE.READ,
      action: 'read',
      subject: 'role',
      desc: 'View roles',
    },
    {
      name: Permissions.ROLE.CREATE,
      action: 'create',
      subject: 'role',
      desc: 'Create roles',
    },
    {
      name: Permissions.ROLE.UPDATE,
      action: 'update',
      subject: 'role',
      desc: 'Update roles',
    },
    {
      name: Permissions.ROLE.ASSIGN,
      action: 'assign',
      subject: 'role',
      desc: 'Assign roles to users',
    },

    // Permission permissions
    {
      name: Permissions.PERMISSION.READ,
      action: 'read',
      subject: 'permission',
      desc: 'View all permissions',
    },
  ];
}

/**
 * Role-Permission mapping for default roles
 */
export interface RolePermissionMap {
  role: string;
  permissions: string[];
}

/**
 * Get role-permission mappings for default roles
 * @example
 * const mappings = getRolePermissionMappings();
 * // Returns array of { role, permissions } objects
 */
export function getRolePermissionMappings(): RolePermissionMap[] {
  return [
    {
      role: 'admin',
      permissions: [
        // All permissions for admin
        Permissions.USER.READ,
        Permissions.USER.CREATE,
        Permissions.USER.UPDATE,
        Permissions.USER.DELETE,
        Permissions.BOOKING.READ,
        Permissions.BOOKING.CREATE,
        Permissions.BOOKING.UPDATE,
        Permissions.BOOKING.DELETE,
        Permissions.BOOKING.CONFIRM,
        Permissions.BOOKING.CANCEL,
        Permissions.BOOKING.REFUND,
        Permissions.FILE.READ,
        Permissions.FILE.UPLOAD,
        Permissions.FILE.DELETE,
        Permissions.ROLE.READ,
        Permissions.ROLE.CREATE,
        Permissions.ROLE.UPDATE,
        Permissions.ROLE.ASSIGN,
        Permissions.PERMISSION.READ,
      ],
    },
    {
      role: 'moderator',
      permissions: [
        // Selected permissions for moderator
        Permissions.USER.READ,
        Permissions.BOOKING.READ,
        Permissions.BOOKING.UPDATE,
        Permissions.BOOKING.CONFIRM,
        Permissions.BOOKING.CANCEL,
        Permissions.FILE.READ,
        Permissions.FILE.DELETE,
      ],
    },
    {
      role: 'user',
      permissions: [
        // Limited permissions for regular user
        Permissions.USER.READ,
        Permissions.BOOKING.READ,
        Permissions.BOOKING.CREATE,
        Permissions.BOOKING.UPDATE,
        Permissions.FILE.READ,
        Permissions.FILE.UPLOAD,
      ],
    },
  ];
}

/**
 * Get all permission names for a role
 * @example
 * const adminPerms = getPermissionsForRole('admin');
 */
export function getPermissionsForRole(roleName: string): string[] {
  const mapping = getRolePermissionMappings().find((m) => m.role === roleName);
  return mapping?.permissions || [];
}
