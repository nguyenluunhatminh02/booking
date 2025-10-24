// common/helpers/encrypt.helper.ts
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * Helper class for encryption and hashing operations
 */
export class EncryptHelper {
  /**
   * Hash a string using bcrypt
   * @param str - String to hash
   * @param saltRounds - Number of salt rounds (default: 10)
   * @returns Hashed string
   */
  static hash(str: string, saltRounds = 10): string {
    return bcrypt.hashSync(str, saltRounds);
  }

  /**
   * Compare a string with a hash
   * @param str - Plain text string
   * @param hash - Hashed string
   * @returns True if match, false otherwise
   */
  static compare(str: string, hash: string): boolean {
    return bcrypt.compareSync(str, hash);
  }

  /**
   * Generate SHA256 hash
   * @returns SHA256 hash string
   */
  static genSha256(): string {
    return crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');
  }

  /**
   * Generate random string
   * @param length - Length of random string
   * @returns Random string
   */
  static generateRandomString(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt data using AES-256-CBC
   * @param data - Data to encrypt
   * @param secretKey - Secret key (32 bytes)
   * @returns Encrypted data with IV
   */
  static encrypt(data: string, secretKey: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data using AES-256-CBC
   * @param encryptedData - Encrypted data with IV
   * @param secretKey - Secret key (32 bytes)
   * @returns Decrypted data
   */
  static decrypt(encryptedData: string, secretKey: string): string {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate hash-based message authentication code
   * @param data - Data to hash
   * @param secret - Secret key
   * @returns HMAC SHA256 hash
   */
  static hmacSha256(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
}
