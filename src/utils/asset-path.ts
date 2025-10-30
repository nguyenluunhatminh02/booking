import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensure font paths exist for pdfmake
 */
export function ensureFontPaths(fonts: Record<string, string[]>): void {
  const missing: string[] = [];

  for (const [family, paths] of Object.entries(fonts)) {
    for (const p of paths) {
      if (!fs.existsSync(p)) {
        missing.push(`${family}: ${p}`);
      }
    }
  }

  if (missing.length > 0) {
    console.warn('⚠️  Missing font files (PDF generation may fail):');
    missing.forEach((m) => console.warn(`   - ${m}`));
  }
}

/**
 * Resolve asset path from project root
 */
export function resolveAsset(...segments: string[]): string {
  return path.resolve(process.cwd(), 'assets', ...segments);
}
