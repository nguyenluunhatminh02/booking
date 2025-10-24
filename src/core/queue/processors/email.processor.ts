import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EmailService } from '@/common/services/email.service';

export interface EmailJobData {
  type: 'welcome' | 'verification' | 'password-reset' | 'password-changed';
  to: string;
  data: {
    name: string;
    token?: string;
  };
}

/**
 * Email Queue Processor
 * Processes email sending jobs asynchronously
 */
@Processor('email', {
  concurrency: 5, // Process 5 emails concurrently
})
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly emailService: EmailService,
    @InjectPinoLogger(EmailProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { type, to, data } = job.data;

    this.logger.info(
      { jobId: job.id, type, to },
      `Processing email job: ${type}`,
    );

    try {
      switch (type) {
        case 'welcome':
          await this.emailService.sendWelcomeEmail(to, data.name);
          break;

        case 'verification':
          if (!data.token) {
            throw new Error('Verification token is required');
          }
          await this.emailService.sendVerificationEmail(
            to,
            data.name,
            data.token,
          );
          break;

        case 'password-reset':
          if (!data.token) {
            throw new Error('Reset token is required');
          }
          await this.emailService.sendPasswordResetEmail(
            to,
            data.name,
            data.token,
          );
          break;

        case 'password-changed':
          await this.emailService.sendPasswordChangedEmail(to, data.name);
          break;

        default:
          throw new Error(`Unknown email type: ${type}`);
      }

      this.logger.info(
        { jobId: job.id, type, to },
        `Email sent successfully: ${type}`,
      );
    } catch (error) {
      this.logger.error(
        { jobId: job.id, type, to, error },
        `Failed to send email: ${type}`,
      );
      throw error; // Re-throw to trigger retry
    }
  }
}
