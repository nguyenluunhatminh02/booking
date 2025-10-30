import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';

const BCRYPT_ROUNDS = 10;
const PASSWORD_PEPPER =
  process.env.PASSWORD_PEPPER || 'default-pepper-change-in-prod';

/**
 * Hash password using bcrypt with salt
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
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Hash refresh token part for storage
 */
export function hashRefreshPart(tokenPart: string): string {
  return crypto
    .createHmac('sha256', PASSWORD_PEPPER)
    .update(tokenPart)
    .digest('hex');
}

/**
 * Verify refresh token part against stored hash
 */
export function verifyRefreshPart(tokenPart: string, hash: string): boolean {
  try {
    const computed = hashRefreshPart(tokenPart);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
}
