// Minimal mock for `file-type` used in e2e tests.
// The real `file-type` package is ESM-only and causes Jest/ts-jest
// resolution problems in our CommonJS test environment. Map this mock
// in the e2e Jest config so the service can import the named export
// `fileTypeFromBuffer` as usual.

export async function fileTypeFromBuffer(buf: Buffer | Uint8Array | null) {
  if (!buf || (buf as Buffer).length === 0) return null;
  const b = Buffer.from(buf as Buffer);
  // JPEG
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' } as const;
  }
  // PNG
  if (
    b.length >= 4 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47
  ) {
    return { ext: 'png', mime: 'image/png' } as const;
  }
  // Fallback: unknown
  return null;
}
