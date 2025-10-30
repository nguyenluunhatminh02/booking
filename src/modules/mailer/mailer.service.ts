import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';

export interface MailAttachment {
  filename: string;
  content: string | Buffer | Readable;
  contentType?: string;
  contentDisposition?: string;
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  attachments?: MailAttachment[];
  categories?: string[];
  headers?: Record<string, string>;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly from: string;

  constructor() {
    this.from = process.env.MAIL_FROM || 'noreply@booking.local';
  }
  async send(options: SendMailOptions): Promise<void> {
    // In a real implementation, integrate with SendGrid, AWS SES, etc.
    // For now, just log the email
    this.logger.log(
      `[EMAIL] To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`,
    );
    this.logger.log(`[EMAIL] Subject: ${options.subject}`);
    this.logger.log(`[EMAIL] From: ${options.from || this.from}`);

    if (options.attachments?.length) {
      this.logger.log(`[EMAIL] Attachments: ${options.attachments.length}`);
    }

    // TODO: Integrate with email service provider
    return Promise.resolve();
  }

  async sendBulk(emails: SendMailOptions[]): Promise<void> {
    for (const email of emails) {
      await this.send(email);
    }
  }
}
