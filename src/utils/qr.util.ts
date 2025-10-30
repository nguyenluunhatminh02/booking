import { hmacSign } from './crypto.util';

const QR_SECRET = process.env.QR_SECRET || 'default-qr-secret-change-me';
const QR_BASE_URL = process.env.QR_BASE_URL || 'https://booking.local/qr';

/**
 * Build signed QR URL for invoice/booking verification
 * Format: {baseUrl}?id={bookingId}&sig={signature}
 */
export function buildSignedQrUrl(bookingId: string): string {
  const sig = hmacSign(bookingId, QR_SECRET);
  return `${QR_BASE_URL}?id=${encodeURIComponent(bookingId)}&sig=${sig}`;
}

/**
 * Verify QR signature
 */
export function verifyQrSignature(
  bookingId: string,
  signature: string,
): boolean {
  const expected = hmacSign(bookingId, QR_SECRET);
  return expected === signature;
}
