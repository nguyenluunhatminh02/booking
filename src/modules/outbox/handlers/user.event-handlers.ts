import { Injectable, Logger } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventListener } from './event-listener.decorator';

/**
 * User event handlers
 * Listens to user.* events from outbox
 */
@Injectable()
export class UserEventHandlers {
  private readonly logger = new Logger(UserEventHandlers.name);

  constructor(
    @InjectPinoLogger(UserEventHandlers.name)
    private readonly pinoLogger: PinoLogger,
  ) {}

  /**
   * Handle: user.created
   * Actions:
   * - Send welcome email
   * - Initialize user profile
   * - Create audit log
   */
  @EventListener('user.created')
  async handleUserCreated(payload: any): Promise<void> {
    const { userId, email } = payload;

    this.pinoLogger.info({ userId, email }, 'User created event handler');

    try {
      // TODO: Integrate with services
      // - await this.mailService.sendWelcomeEmail(email);
      // - await this.userService.initializeProfile(userId);
      // - await this.auditService.log('USER_CREATED', { userId, email });

      this.pinoLogger.debug({ userId }, 'User created event processed');
    } catch (error) {
      this.pinoLogger.error(
        { userId, error },
        'Failed to handle user created event',
      );
      throw error;
    }

    return Promise.resolve();
  }

  /**
   * Handle: user.email_verified
   * Actions:
   * - Update user verification status
   * - Send verification confirmation
   * - Unlock features
   */
  @EventListener('user.email_verified')
  async handleUserEmailVerified(payload: any): Promise<void> {
    const { userId, email } = payload;

    this.pinoLogger.info(
      { userId, email },
      'User email verified event handler',
    );

    try {
      // TODO: Integrate with services
      // - await this.mailService.sendVerificationConfirmation(email);
      // - await this.userService.unlockFeatures(userId);

      this.pinoLogger.debug({ userId }, 'User email verified event processed');
    } catch (error) {
      this.pinoLogger.error(
        { userId, error },
        'Failed to handle user email verified event',
      );
      throw error;
    }

    return Promise.resolve();
  }

  /**
   * Handle: user.password_reset
   * Actions:
   * - Revoke all tokens
   * - Send confirmation email
   * - Log security event
   */
  @EventListener('user.password_reset')
  async handleUserPasswordReset(payload: any): Promise<void> {
    const { userId, email } = payload;

    this.pinoLogger.info(
      { userId, email },
      'User password reset event handler',
    );

    try {
      // TODO: Integrate with services
      // - await this.authService.revokeAllTokens(userId);
      // - await this.mailService.sendPasswordResetConfirmation(email);
      // - await this.securityService.logEvent('PASSWORD_RESET', userId);

      this.pinoLogger.debug({ userId }, 'User password reset event processed');
    } catch (error) {
      this.pinoLogger.error(
        { userId, error },
        'Failed to handle user password reset event',
      );
      throw error;
    }

    return Promise.resolve();
  }
}
