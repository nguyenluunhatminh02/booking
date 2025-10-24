import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

/**
 * Queue Service
 * Provides convenient methods to add jobs to queues
 */
@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('email') private emailQueue: any, // Let TypeScript infer from InjectQueue
    @InjectQueue('files') private filesQueue: any,
    @InjectQueue('cleanup') private cleanupQueue: any,
    @InjectPinoLogger(QueueService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, name: string) {
    const job = await this.emailQueue.add('welcome', {
      type: 'welcome',
      to,
      data: { name },
    });

    this.logger.info({ jobId: job.id, to }, 'Queued welcome email');
    return job;
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(to: string, name: string, token: string) {
    const job = await this.emailQueue.add('verification', {
      type: 'verification',
      to,
      data: { name, token },
    });

    this.logger.info({ jobId: job.id, to }, 'Queued verification email');
    return job;
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const job = await this.emailQueue.add('password-reset', {
      type: 'password-reset',
      to,
      data: { name, token },
    });

    this.logger.info({ jobId: job.id, to }, 'Queued password reset email');
    return job;
  }

  /**
   * Send password changed email
   */
  async sendPasswordChangedEmail(to: string, name: string) {
    const job = await this.emailQueue.add('password-changed', {
      type: 'password-changed',
      to,
      data: { name },
    });

    this.logger.info({ jobId: job.id, to }, 'Queued password changed email');
    return job;
  }

  /**
   * Process file thumbnail generation
   */
  async createThumbnail(fileId: string, maxSize = 512) {
    const job = await this.filesQueue.add('thumbnail', {
      type: 'thumbnail',
      fileId,
      options: { maxSize },
    });

    this.logger.info({ jobId: job.id, fileId }, 'Queued thumbnail generation');
    return job;
  }

  /**
   * Schedule orphan files cleanup
   */
  async cleanupOrphanFiles(olderThan?: Date) {
    const job = await this.cleanupQueue.add(
      'orphan-files',
      {
        type: 'orphan-files',
        olderThan,
      },
      {
        // Run immediately, but don't repeat
        delay: 0,
      },
    );

    this.logger.info({ jobId: job.id }, 'Queued orphan files cleanup');
    return job;
  }

  /**
   * Schedule expired tokens cleanup
   */
  async cleanupExpiredTokens() {
    const job = await this.cleanupQueue.add('expired-tokens', {
      type: 'expired-tokens',
    });

    this.logger.info({ jobId: job.id }, 'Queued expired tokens cleanup');
    return job;
  }

  /**
   * Schedule expired idempotency records cleanup
   */
  async cleanupExpiredIdempotency(olderThan?: Date) {
    const job = await this.cleanupQueue.add('expired-idempotency', {
      type: 'expired-idempotency',
      olderThan,
    });

    this.logger.info({ jobId: job.id }, 'Queued idempotency cleanup');
    return job;
  }

  /**
   * Schedule old refresh tokens cleanup
   */
  async cleanupOldRefreshTokens() {
    const job = await this.cleanupQueue.add('old-refresh-tokens', {
      type: 'old-refresh-tokens',
    });

    this.logger.info({ jobId: job.id }, 'Queued refresh tokens cleanup');
    return job;
  }

  /**
   * Get queue stats
   */
  async getQueueStats() {
    const [emailCounts, filesCounts, cleanupCounts] = await Promise.all([
      this.emailQueue.getJobCounts(),
      this.filesQueue.getJobCounts(),
      this.cleanupQueue.getJobCounts(),
    ]);

    return {
      email: emailCounts,
      files: filesCounts,
      cleanup: cleanupCounts,
    };
  }
}
