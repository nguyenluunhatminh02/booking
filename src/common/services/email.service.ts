import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly appUrl: string;

  constructor(
    private readonly config: ConfigService,
    @InjectPinoLogger(EmailService.name)
    private readonly logger: PinoLogger,
  ) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    }

    // Support both EMAIL_FROM and MAIL_FROM env var names (backwards compatibility)
    this.fromEmail =
      this.config.get<string>('EMAIL_FROM') ||
      this.config.get<string>('MAIL_FROM') ||
      'noreply@example.com';
    this.fromName = this.config.get<string>('EMAIL_FROM_NAME') || 'NestJS App';
    this.appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000';
  }

  /**
   * Send email using SendGrid
   */
  async sendMail(options: EmailOptions): Promise<void> {
    try {
      // Derive a non-empty plain-text fallback for SendGrid validation
      const derivedText = (options.text || '').toString().trim();

      let textFallback = derivedText;
      if (!textFallback && options.html) {
        // Strip HTML tags to create a simple plaintext alternative
        try {
          textFallback = options.html
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        } catch (e) {
          textFallback = '';
        }
      }

      if (!textFallback) {
        // Ensure we never send an empty string for content value
        textFallback = ' '; // single space to satisfy API validation while remaining harmless
      }

      const msg: any = {
        to: options.to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: options.subject,
        text: textFallback,
      };

      if (options.html) {
        msg.html = options.html;
      }

      const isDev =
        String(this.config.get('NODE_ENV') || '').toLowerCase() ===
        'development';
      const forceSend =
        String(this.config.get('SENDGRID_FORCE_SEND') || '').toLowerCase() ===
        'true';

      if (isDev && !forceSend) {
        this.logger.info(
          { to: options.to, subject: options.subject },
          'Email suppressed in development mode (set SENDGRID_FORCE_SEND=true to override)',
        );
        console.log('📧 Email Details (dev):', {
          to: options.to,
          subject: options.subject,
        });
        return;
      }

      if (!this.config.get<string>('SENDGRID_API_KEY')) {
        this.logger.error('SendGrid API key is missing; cannot send email');
        throw new Error('SendGrid API key is not configured');
      }

      // Send via SendGrid
      const sgResponse = await sgMail.send(msg);
      this.logger.info(
        { to: options.to, status: sgResponse?.[0]?.statusCode },
        'Email sent successfully',
      );
    } catch (error) {
      const sgErr = error?.response?.body || error;
      this.logger.error(
        { error: sgErr, to: options.to },
        'Failed to send email',
      );
      throw error;
    }
  }

  /**
   * Send welcome email after registration
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const subject = `Welcome to ${this.fromName}! 🎉`;
    const html = this.getWelcomeEmailTemplate(name);

    await this.sendMail({ to: email, subject, html });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const verifyUrl = `${this.appUrl}/auth/verify-email?token=${token}`;
    const subject = 'Verify Your Email Address';
    const html = this.getVerificationEmailTemplate(name, verifyUrl);

    await this.sendMail({ to: email, subject, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const resetUrl = `${this.appUrl}/auth/reset-password?token=${token}`;
    const subject = 'Reset Your Password';
    const html = this.getPasswordResetEmailTemplate(name, resetUrl);

    await this.sendMail({ to: email, subject, html });
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedEmail(email: string, name: string): Promise<void> {
    const subject = 'Your Password Was Changed';
    const html = this.getPasswordChangedEmailTemplate(name);

    await this.sendMail({ to: email, subject, html });
  }

  // ==================== EMAIL TEMPLATES ====================

  private getWelcomeEmailTemplate(name: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #667eea; margin-top: 0; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: #ffffff !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #5568d3; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .divider { height: 1px; background: #e9ecef; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome Aboard!</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>Welcome to <strong>${this.fromName}</strong>! We're thrilled to have you join our community.</p>
      <p>Your account has been successfully created. You can now access all features and start your journey with us.</p>
      <div class="divider"></div>
      <p><strong>What's next?</strong></p>
      <ul>
        <li>Complete your profile</li>
        <li>Explore our features</li>
        <li>Join our community</li>
      </ul>
      <p style="text-align: center;">
        <a href="${this.appUrl}/dashboard" class="button">Get Started</a>
      </p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${this.fromName}. All rights reserved.</p>
      <p>You received this email because you signed up for ${this.fromName}.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private getVerificationEmailTemplate(
    name: string,
    verifyUrl: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #667eea; margin-top: 0; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: #ffffff !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #5568d3; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✉️ Verify Your Email</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>Thank you for signing up! To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
      <p style="text-align: center;">
        <a href="${verifyUrl}" class="button">Verify Email Address</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea; font-size: 14px;">${verifyUrl}</p>
      <div class="warning">
        <strong>⚠️ Important:</strong> This verification link will expire in <strong>24 hours</strong>. If you didn't create an account, please ignore this email.
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${this.fromName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private getPasswordResetEmailTemplate(
    name: string,
    resetUrl: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #f5576c; margin-top: 0; }
    .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: #ffffff !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #e14655; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 Reset Your Password</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #f5576c; font-size: 14px;">${resetUrl}</p>
      <div class="warning">
        <strong>⚠️ Security Notice:</strong><br>
        • This link will expire in <strong>1 hour</strong><br>
        • If you didn't request this, please ignore this email<br>
        • Your password will remain unchanged unless you click the link above
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${this.fromName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private getPasswordChangedEmailTemplate(name: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #43e97b; margin-top: 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    .alert { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Password Changed</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>This email confirms that your password was successfully changed on <strong>${new Date().toLocaleString()}</strong>.</p>
      <div class="alert">
        <strong>ℹ️ Didn't make this change?</strong><br>
        If you didn't change your password, please contact our support team immediately at <a href="mailto:support@example.com">support@example.com</a>.
      </div>
      <p>For your security, we recommend:</p>
      <ul>
        <li>Using a strong, unique password</li>
        <li>Enabling two-factor authentication</li>
        <li>Not sharing your password with anyone</li>
      </ul>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${this.fromName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
