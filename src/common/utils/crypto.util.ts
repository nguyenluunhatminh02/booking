// common/utils/crypto.util.ts
import crypto from 'crypto';
import * as argon2 from 'argon2';

// HMAC-SHA256 tiện dụng
export const hmacSHA256 = (secret: string, payload: string) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

// So sánh hằng thời gian an toàn cho chuỗi KHÁC độ dài
// (hash 2 chuỗi rồi timingSafeEqual trên 2 buffer cùng độ dài)
export const safeEq = (a: string, b: string) => {
  const ah = crypto.createHash('sha256').update(a).digest();
  const bh = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ah, bh);
};

// ID ngẫu nhiên (URL-safe)
export const randomId = (len = 24) =>
  crypto.randomBytes(len).toString('base64url');

// ===== Password (Argon2id) =====
const ARGON_MEMORY = Number(process.env.ARGON_MEMORY_KIB ?? 65536); // 64 MiB
const ARGON_TIME = Number(process.env.ARGON_TIME_COST ?? 3);
const ARGON_PARALLEL = Number(process.env.ARGON_PARALLELISM ?? 4);

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: ARGON_MEMORY,
    timeCost: ARGON_TIME,
    parallelism: ARGON_PARALLEL,
  });
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// ===== Token =====

// Token ngẫu nhiên (URL-safe). 32 bytes -> ~43 ký tự base64url.
export function generateToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

// Hash token để lưu DB (HMAC + pepper bí mật từ env)
const TOKEN_PEPPER = process.env.TOKEN_PEPPER ?? '';
export function hashToken(token: string): string {
  // dùng HMAC thay vì SHA256 thuần để chống rainbow & cho phép rotate pepper
  return crypto.createHmac('sha256', TOKEN_PEPPER).update(token).digest('hex');
}
