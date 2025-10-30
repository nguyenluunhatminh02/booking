// src/common/guards/type-guards.ts

import {
  Booking,
  User,
  Payment,
  Permission,
  SystemRole,
  BookingStatus,
} from '@prisma/client';

/**
 * Runtime type guards for type safety
 * Use these to validate data at runtime, not just at compile time
 */

// ============= User Type Guards =============

export const isValidUser = (obj: any): obj is User => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.firstName === 'string' &&
    typeof obj.lastName === 'string' &&
    typeof obj.isActive === 'boolean'
  );
};

export const isValidUserId = (id: any): id is string => {
  return typeof id === 'string' && id.length > 0 && id.trim().length > 0;
};

export const isValidEmail = (email: any): boolean => {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidSystemRole = (role: any): role is SystemRole => {
  const validRoles = ['USER', 'ADMIN', 'MODERATOR'];
  return typeof role === 'string' && validRoles.includes(role);
};

// ============= Booking Type Guards =============

export const isValidBooking = (obj: any): obj is Booking => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.title === 'string' &&
    obj.startTime instanceof Date &&
    obj.endTime instanceof Date &&
    typeof obj.status === 'string' &&
    isValidBookingStatus(obj.status)
  );
};

export const isValidBookingStatus = (status: any): status is BookingStatus => {
  const validStatuses: BookingStatus[] = [
    'DRAFT',
    'PENDING',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'REFUND_PENDING',
    'REFUNDED',
    'HOLD',
    'REVIEW',
    'PAID',
  ];
  return (
    typeof status === 'string' &&
    validStatuses.includes(status as BookingStatus)
  );
};

export const isValidBookingAmount = (amount: any): boolean => {
  if (typeof amount !== 'object' || amount === null) return false;
  // Prisma Decimal check
  return 'toFixed' in amount && typeof amount.toFixed === 'function';
};

export const isValidDateRange = (startTime: any, endTime: any): boolean => {
  if (!(startTime instanceof Date) || !(endTime instanceof Date)) return false;
  return startTime < endTime;
};

// ============= Payment Type Guards =============

export const isValidPayment = (obj: any): obj is Payment => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.bookingId === 'string' &&
    typeof obj.amount === 'object'
  );
};

export const isValidPaymentProvider = (provider: any): boolean => {
  const validProviders = ['STRIPE', 'VNPAY', 'MOCK'];
  return (
    typeof provider === 'string' &&
    validProviders.includes(provider.toUpperCase())
  );
};

export const isValidPaymentStatus = (status: any): boolean => {
  const validStatuses = [
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'REFUNDED',
    'CANCELLED',
  ];
  return typeof status === 'string' && validStatuses.includes(status);
};

// ============= Permission Type Guards =============

export const isValidPermission = (obj: any): obj is Permission => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.action === 'string' &&
    typeof obj.subject === 'string'
  );
};

export const isValidAction = (action: any): boolean => {
  const validActions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE'];
  return (
    typeof action === 'string' && validActions.includes(action.toUpperCase())
  );
};

export const isValidSubject = (subject: any): boolean => {
  return typeof subject === 'string' && subject.length > 0;
};

// ============= Generic Utility Guards =============

export const isUUID = (value: any): boolean => {
  if (typeof value !== 'string') return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export const isCUID = (value: any): boolean => {
  if (typeof value !== 'string') return false;
  // CUID format: c + 24 lowercase alphanumeric chars
  return /^c[a-z0-9]{24}$/.test(value);
};

export const isValidId = (value: any): value is string => {
  // Accepts either UUID or CUID
  return isUUID(value) || isCUID(value);
};

export const isValidTimestamp = (value: any): boolean => {
  if (!(value instanceof Date)) return false;
  return !isNaN(value.getTime());
};

export const isValidJSON = (value: any): boolean => {
  if (typeof value !== 'string') return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isNonEmptyString = (value: any): boolean => {
  return typeof value === 'string' && value.trim().length > 0;
};

export const isValidPageNumber = (page: any): boolean => {
  return Number.isInteger(page) && page > 0;
};

export const isValidPageLimit = (limit: any): boolean => {
  return Number.isInteger(limit) && limit > 0 && limit <= 100;
};

// ============= Type Guard Utility Functions =============

/**
 * Create a type guard validator
 * @example
 * const user = validateType(data, isValidUser);
 * // user is guaranteed to be User type or throws error
 */
export function validateType<T>(
  data: any,
  guard: (data: any) => data is T,
  fieldName: string = 'Value',
): T {
  if (!guard(data)) {
    throw new TypeError(`${fieldName} failed type validation`);
  }
  return data;
}

/**
 * Safely cast with guard
 * @example
 * const user = safecast(data, isValidUser);
 * // if (user) use it
 */
export function safecast<T>(
  data: any,
  guard: (data: any) => data is T,
): T | null {
  return guard(data) ? data : null;
}

/**
 * Validate array of items
 * @example
 * const users = validateArray(data, isValidUser);
 */
export function validateArray<T>(
  arr: any,
  guard: (item: any) => item is T,
): T[] {
  if (!Array.isArray(arr)) {
    throw new TypeError('Expected array');
  }
  return arr.map((item, index) => {
    if (!guard(item)) {
      throw new TypeError(`Item at index ${index} failed type validation`);
    }
    return item;
  });
}

/**
 * Ensure at least one property exists
 */
export function hasAnyProperty(obj: any, ...keys: string[]): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  return keys.some((key) => key in obj && obj[key] !== undefined);
}

/**
 * Ensure all properties exist
 */
export function hasAllProperties(obj: any, ...keys: string[]): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  return keys.every((key) => key in obj && obj[key] !== undefined);
}
