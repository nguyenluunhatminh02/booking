/**
 * 📋 RBAC Permissions Constants
 *
 * Type-safe constants for all permissions in the system.
 * Use these instead of hardcoding strings to avoid typos and enable IDE autocomplete.
 *
 * @example
 * @RequirePermissions([Permissions.BOOKING.READ])
 * @RequirePermissions([Permissions.USER.CREATE, Permissions.USER.UPDATE], 'all')
 */

export const Permissions = {
  /**
   * User Management Permissions (4)
   */
  USER: {
    /** View user information */
    READ: 'user.read',
    /** Create new user */
    CREATE: 'user.create',
    /** Update user information */
    UPDATE: 'user.update',
    /** Delete user account */
    DELETE: 'user.delete',
  },

  /**
   * Booking Management Permissions (7)
   */
  BOOKING: {
    /** View bookings */
    READ: 'booking.read',
    /** Create new booking */
    CREATE: 'booking.create',
    /** Update booking details */
    UPDATE: 'booking.update',
    /** Delete booking */
    DELETE: 'booking.delete',
    /** Confirm booking status */
    CONFIRM: 'booking.confirm',
    /** Cancel booking */
    CANCEL: 'booking.cancel',
    /** Process refund for booking */
    REFUND: 'booking.refund',
  },

  /**
   * File Management Permissions (3)
   */
  FILE: {
    /** Download/view files */
    READ: 'file.read',
    /** Upload new files */
    UPLOAD: 'file.upload',
    /** Delete files */
    DELETE: 'file.delete',
  },

  /**
   * Role Management Permissions (4)
   */
  ROLE: {
    /** View roles */
    READ: 'role.read',
    /** Create new role */
    CREATE: 'role.create',
    /** Update role configuration */
    UPDATE: 'role.update',
    /** Assign roles to users */
    ASSIGN: 'role.assign',
  },

  /**
   * Permission Management Permissions (1)
   */
  PERMISSION: {
    /** View all permissions */
    READ: 'permission.read',
  },
} as const;

/**
 * Type for Permission values
 */
export type PermissionValue =
  | (typeof Permissions.USER)[keyof typeof Permissions.USER]
  | (typeof Permissions.BOOKING)[keyof typeof Permissions.BOOKING]
  | (typeof Permissions.FILE)[keyof typeof Permissions.FILE]
  | (typeof Permissions.ROLE)[keyof typeof Permissions.ROLE]
  | (typeof Permissions.PERMISSION)[keyof typeof Permissions.PERMISSION];

/**
 * Array of all permissions (21 total)
 * Useful for seeding or listing all available permissions
 */
export const ALL_PERMISSIONS: PermissionValue[] = [
  // User permissions
  Permissions.USER.READ,
  Permissions.USER.CREATE,
  Permissions.USER.UPDATE,
  Permissions.USER.DELETE,

  // Booking permissions
  Permissions.BOOKING.READ,
  Permissions.BOOKING.CREATE,
  Permissions.BOOKING.UPDATE,
  Permissions.BOOKING.DELETE,
  Permissions.BOOKING.CONFIRM,
  Permissions.BOOKING.CANCEL,
  Permissions.BOOKING.REFUND,

  // File permissions
  Permissions.FILE.READ,
  Permissions.FILE.UPLOAD,
  Permissions.FILE.DELETE,

  // Role permissions
  Permissions.ROLE.READ,
  Permissions.ROLE.CREATE,
  Permissions.ROLE.UPDATE,
  Permissions.ROLE.ASSIGN,

  // Permission permissions
  Permissions.PERMISSION.READ,
];

/**
 * Get all permissions for a specific resource
 * @param resource 'user' | 'booking' | 'file' | 'role' | 'permission'
 * @example getResourcePermissions('booking') // ['booking.read', 'booking.create', ...]
 */
export function getResourcePermissions(
  resource: keyof typeof Permissions,
): PermissionValue[] {
  return Object.values(Permissions[resource]) as PermissionValue[];
}

/**
 * Check if a permission exists
 * @example hasPermission('booking.read') // true
 */
export function hasPermission(permission: string): boolean {
  return ALL_PERMISSIONS.includes(permission as PermissionValue);
}

/**
 * Get permission name from constant
 * @example getPermissionName(Permissions.BOOKING.READ) // 'booking.read'
 */
export function getPermissionName(permission: PermissionValue): string {
  return permission;
}
