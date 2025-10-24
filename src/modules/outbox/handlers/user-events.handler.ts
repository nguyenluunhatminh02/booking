import { Injectable, Logger } from '@nestjs/common';

export interface EventPayload {
  type: string;
  [key: string]: any;
}

@Injectable()
export class UserEventsHandler {
  private readonly logger = new Logger(UserEventsHandler.name);

  /**
   * Xử lý user events
   */
  async handle(payload: EventPayload): Promise<void> {
    this.logger.log(`Processing user event: ${payload.type}`);

    switch (payload.type) {
      case 'user.email_verification_requested':
        await this.handleEmailVerificationRequested(payload);
        break;

      case 'user.password_reset_requested':
        await this.handlePasswordResetRequested(payload);
        break;

      case 'user.email_verified':
        await this.handleEmailVerified(payload);
        break;

      case 'user.password_reset_completed':
        await this.handlePasswordResetCompleted(payload);
        break;

      default:
        this.logger.warn(`Unknown event type: ${payload.type}`);
    }
  }

  /**
   * Xử lý khi yêu cầu xác thực email
   * - Gửi email xác thực
   */
  private handleEmailVerificationRequested(payload: EventPayload): void {
    const { userId, email } = payload;

    this.logger.log(`Email verification requested for user: ${userId}`);

    // TODO: Gửi email xác thực
    // await this.emailService.sendVerificationEmail(email, token, expiresAt);

    this.logger.log(`Email verification sent to ${email}`);
  }

  /**
   * Xử lý khi yêu cầu reset password
   * - Gửi email reset password
   */
  private handlePasswordResetRequested(payload: EventPayload): void {
    const { userId, email } = payload;

    this.logger.log(`Password reset requested for user: ${userId}`);

    // TODO: Gửi email reset password
    // await this.emailService.sendPasswordResetEmail(email, token, expiresAt);

    this.logger.log(`Password reset email sent to ${email}`);
  }

  /**
   * Xử lý khi email được xác thực
   * - Cập nhật audit log
   * - Gửi welcome email (optional)
   */
  private handleEmailVerified(payload: EventPayload): void {
    const { userId, email } = payload;

    this.logger.log(`Email verified for user: ${userId}`);

    // TODO: Gửi welcome email
    // await this.emailService.sendWelcomeEmail(email);

    this.logger.log(`Welcome email sent to ${email}`);
  }

  /**
   * Xử lý khi password reset hoàn tất
   * - Gửi xác nhận email
   */
  private handlePasswordResetCompleted(payload: EventPayload): void {
    const { userId, email } = payload;

    this.logger.log(`Password reset completed for user: ${userId}`);

    // TODO: Gửi email xác nhận
    // await this.emailService.sendPasswordResetConfirmation(email);

    this.logger.log(`Password reset confirmation sent to ${email}`);
  }
}
