// Minimal mock for '@aws-sdk/s3-request-presigner' used in e2e tests.
// We export a plain function so tests can spyOn / mockImplementation it.
export async function getSignedUrl(_client: unknown, cmd: any) {
  // Best-effort detection by command constructor name
  const name = cmd?.constructor?.name ?? '';
  if (name.includes('GetObjectCommand')) return 'https://signed-get-url';
  if (name.includes('PutObjectCommand')) return 'https://signed-put-url';
  return 'https://signed-url';
}
