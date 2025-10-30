import * as crypto from 'crypto';

/**
 * Generate SHA256 hex hash from input string
 */
export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Generate random token (hex)
 */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate HMAC signature
 */
export function hmacSign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function hmacVerify(
  data: string,
  signature: string,
  secret: string,
): boolean {
  const expected = hmacSign(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
