import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * TokenStateService - manages auth token lifecycle and invalidation
 * Placeholder implementation - requires Redis integration and schema updates
 */
@Injectable()
export class TokenStateService {
  constructor(private prisma: PrismaService) {}

  // Access Version (invalidate all)
  // eslint-disable-next-line @typescript-eslint/require-await
  async getAccessVersion(): Promise<number> {
    return 1;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async bumpAccessVersion(): Promise<number> {
    return 2;
  }

  // Denylist JTI (revoke single AT)

  async denylistJti(): Promise<void> {
    // Placeholder
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async isJtiDenied(): Promise<boolean> {
    return false;
  }

  // Lock user

  async lockUser(): Promise<void> {
    // Placeholder
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async isUserLocked(): Promise<boolean> {
    return false;
  }

  // Session Version (revoke by session)
  // eslint-disable-next-line @typescript-eslint/require-await
  async getSessionVersion(): Promise<number> {
    return 1;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async bumpSessionVersion(): Promise<number> {
    return 2;
  }
}
