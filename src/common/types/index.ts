// common/types/index.ts

/**
 * Nullable type - T or null
 */
export type NullableType<T> = T | null;

/**
 * Maybe type - T or undefined
 */
export type MaybeType<T> = T | undefined;

/**
 * OrNever type - T or never
 */
export type OrNeverType<T> = T | never;

/**
 * Deep Partial - make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep Required - make all properties required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Constructor type
 */
export type Constructor<T = any> = new (...args: any[]) => T;

/**
 * Abstract Constructor type
 */
export type AbstractConstructor<T = any> = abstract new (...args: any[]) => T;
