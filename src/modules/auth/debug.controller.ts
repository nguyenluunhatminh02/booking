import { Body, BadRequestException, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@/common/services';

@Controller('debug/email')
export class DebugEmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  @Post('test')
  async sendTest(
    @Body() body: { to?: string; subject?: string; html?: string },
  ) {
    const isProd =
      String(this.config.get('NODE_ENV') || '').toLowerCase() === 'production';
    if (isProd) throw new BadRequestException('Not allowed in production');

    const to =
      body?.to || this.config.get('MAIL_FROM') || this.config.get('EMAIL_FROM');
    if (!to) throw new BadRequestException('No recipient specified');

    const subject =
      body?.subject ||
      `Test email from ${this.config.get('EMAIL_FROM_NAME') || 'App'}`;
    const html =
      body?.html || `<p>Test email sent at ${new Date().toISOString()}</p>`;

    try {
      // EmailService.sendMail returns void; this will throw on error
      await this.emailService.sendMail({ to, subject, html });
      return { success: true, to };
    } catch (err) {
      const sgErr = err?.response?.body || err;
      return { success: false, error: sgErr };
    }
  }
}
