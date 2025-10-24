import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/prisma/prisma.service';
import { FilesService } from '@/modules/files/files.service';
export interface CleanupJobData {
  type:
    | 'orphan-files'
    | 'expired-tokens'
    | 'expired-idempotency'
    | 'old-refresh-tokens';
  olderThan?: Date;
}

/**
 * Cleanup Queue Processor
 * Handles background cleanup tasks
 */
@Processor('cleanup', {
  concurrency: 1, // Run cleanup tasks one at a time
})
export class CleanupProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    @InjectPinoLogger(CleanupProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job<CleanupJobData>): Promise<void> {
    const { type, olderThan } = job.data;

    this.logger.info({ jobId: job.id, type }, `Starting cleanup: ${type}`);

    try {
      switch (type) {
        case 'orphan-files':
          await this.cleanupOrphanFiles(olderThan);
          break;

        case 'expired-tokens':
          await this.cleanupExpiredTokens();
          break;

        case 'expired-idempotency':
          await this.cleanupExpiredIdempotency(olderThan);
          break;

        case 'old-refresh-tokens':
          await this.cleanupOldRefreshTokens();
          break;

        default:
          throw new Error(`Unknown cleanup type: ${type}`);
      }

      this.logger.info({ jobId: job.id, type }, `Cleanup completed: ${type}`);
    } catch (error) {
      this.logger.error(
        { jobId: job.id, type, error },
        `Cleanup failed: ${type}`,
      );
      throw error;
    }
  }

  /**
   * Delete orphan files that are stuck in UPLOADING status
   */
  private async cleanupOrphanFiles(olderThan?: Date) {
    const cutoffDate = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const orphans = await this.prisma.fileObject.findMany({
      where: {
        status: 'UPLOADING',
        createdAt: { lt: cutoffDate },
      },
    });

    this.logger.info({ count: orphans.length }, 'Found orphan files');

    for (const file of orphans) {
      try {
        await this.filesService.deleteFile(file.id, true);
        this.logger.debug({ fileId: file.id }, 'Deleted orphan file');
      } catch (error) {
        this.logger.warn(
          { fileId: file.id, error },
          'Failed to delete orphan file',
        );
      }
    }

    return orphans.length;
  }

  /**
   * Delete expired verification tokens
   */
  private async cleanupExpiredTokens() {
    const result = await this.prisma.verificationToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.info({ count: result.count }, 'Deleted expired tokens');
    return result.count;
  }

  /**
   * Delete old idempotency records
   */
  private async cleanupExpiredIdempotency(olderThan?: Date) {
    const cutoffDate =
      olderThan || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const result = await this.prisma.idempotency.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: ['COMPLETED', 'FAILED'] },
      },
    });

    this.logger.info(
      { count: result.count },
      'Deleted old idempotency records',
    );
    return result.count;
  }

  /**
   * Delete revoked and expired refresh tokens
   */
  private async cleanupOldRefreshTokens() {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ revokedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
      },
    });

    this.logger.info({ count: result.count }, 'Deleted old refresh tokens');
    return result.count;
  }
}
