import * as crypto from 'node:crypto';
import * as bcrypt from 'bcrypt';

const TOKEN_PEPPER =
  process.env.TOKEN_PEPPER || 'default-pepper-change-in-prod';
const BCRYPT_ROUNDS = 10;

/**
 * Generate random token part (URL-safe base64)
 */
export function genTokenPart(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Build refresh token: sessionId.tokenPart
 */
export function buildRefreshToken(
  sessionId: string,
  tokenPart: string,
): string {
  return `${sessionId}.${tokenPart}`;
}

/**
 * Split refresh token into parts
 */
export function splitRefreshToken(
  token: string,
): { sessionId: string; tokenPart: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [sessionId, tokenPart] = parts;
  if (!sessionId || !tokenPart) return null;
  return { sessionId, tokenPart };
}

/**
 * Hash refresh token part for storage
 */
export function hashRefreshPart(tokenPart: string): string {
  return crypto
    .createHmac('sha256', TOKEN_PEPPER)
    .update(tokenPart)
    .digest('hex');
}

/**
 * Verify refresh token part against stored hash
 */
export function verifyRefreshPart(tokenPart: string, hash: string): boolean {
  const computed = hashRefreshPart(tokenPart);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against bcrypt hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Parse duration string to seconds
 * Examples: '15m' -> 900, '1h' -> 3600, '7d' -> 604800
 */
export function parseDurationToSec(
  duration?: string,
  defaultSec = 3600,
): number {
  if (!duration) return defaultSec;

  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return defaultSec;

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case 's':
      return num;
    case 'm':
      return num * 60;
    case 'h':
      return num * 3600;
    case 'd':
      return num * 86400;
    default:
      return defaultSec;
  }
}
