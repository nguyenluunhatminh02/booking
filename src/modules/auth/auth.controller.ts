import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '@/common/decorators';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RateLimit } from '@/core/rate-limit/rate-limit.decorator';
import { ApiOperationDecorator, ApiResponseType } from '@/common/decorators';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @SkipThrottle() // Skip global throttle, use token bucket
  @RateLimit({
    capacity: 5,
    refillPerSec: 0.5,
    keyBy: 'userOrIp',
    prefix: 'rl:login',
    message: 'Too many login attempts. Please try again later.',
  })
  @HttpCode(HttpStatus.OK)
  // @UsePipes(new ZodValidationPipe(loginSchema))
  @ApiOperationDecorator({
    summary: 'Login user',
    description:
      'Authenticate user with email and password. Returns access token and refresh token.',
    bodyType: LoginDto,
    exclude: [ApiResponseType.Forbidden, ApiResponseType.NotFound],
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  // @Throttle({ default: { ttl: 3600000, limit: 5 } }) // 5 registrations per hour
  // @UsePipes(makeZodValidationPipe(registerSchema))
  @ApiOperationDecorator({
    summary: 'Register new user',
    description:
      'Create a new user account. Sends verification email. Supports either `name` (full name) or `firstName` + `lastName`.',
    bodyType: RegisterDto,
    exclude: [
      ApiResponseType.Unauthorized,
      ApiResponseType.Forbidden,
      ApiResponseType.NotFound,
    ],
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperationDecorator({
    summary: 'Refresh access token',
    description:
      'Get a new access token using refresh token. Extends user session.',
    bodyType: RefreshTokenDto,
    exclude: [
      ApiResponseType.Forbidden,
      ApiResponseType.NotFound,
      ApiResponseType.BadRequest,
    ],
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperationDecorator({
    summary: 'Logout user',
    description:
      'Invalidate refresh token and log out current user. Requires authentication.',
    exclude: [
      ApiResponseType.BadRequest,
      ApiResponseType.Forbidden,
      ApiResponseType.NotFound,
    ],
  })
  async logout(@Req() req: any, @Body() body: { refreshToken?: string }) {
    await this.authService.logout(req.user.id, body.refreshToken);
  }

  @Public()
  @Get('verify-email')
  @SkipThrottle()
  @ApiOperationDecorator({
    summary: 'Verify email with token',
    description:
      'Verify user email address using verification token sent via email.',
    exclude: [
      ApiResponseType.Unauthorized,
      ApiResponseType.Forbidden,
      ApiResponseType.NotFound,
    ],
  })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { ttl: 600000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperationDecorator({
    summary: 'Request password reset',
    description:
      'Send password reset email if user exists. Always returns 200 for security.',
    bodyType: ForgotPasswordDto,
    exclude: [
      ApiResponseType.Unauthorized,
      ApiResponseType.Forbidden,
      ApiResponseType.NotFound,
    ],
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { ttl: 600000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperationDecorator({
    summary: 'Reset password with token',
    description:
      'Reset user password using reset token from email. Token expires after 1 hour.',
    bodyType: ResetPasswordDto,
    exclude: [
      ApiResponseType.Unauthorized,
      ApiResponseType.Forbidden,
      ApiResponseType.NotFound,
    ],
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperationDecorator({
    summary: 'Change password',
    description:
      'Change password for authenticated user. Requires current password verification.',
    bodyType: ChangePasswordDto,
    exclude: [ApiResponseType.Forbidden, ApiResponseType.NotFound],
  })
  async changePassword(
    @Req() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @SkipThrottle()
  @ApiOperationDecorator({
    summary: 'Get current user profile',
    description:
      'Get authenticated user information. Requires valid JWT token.',
    exclude: [
      ApiResponseType.BadRequest,
      ApiResponseType.Forbidden,
      ApiResponseType.NotFound,
    ],
  })
  async getProfile(@Req() req: any) {
    return req.user;
  }
}
