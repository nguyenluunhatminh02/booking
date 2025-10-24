// common/pipes/parse-uuid.pipe.ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// Small, dependency-free UUID validation to avoid importing ESM-only 'uuid' in tests
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string> {
  transform(value: string) {
    if (!isUUID(value)) throw new BadRequestException('Invalid UUID');
    return value;
  }
}
