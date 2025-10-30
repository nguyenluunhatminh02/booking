// src/common/dto/response-dtos/user.response.ts

import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { BaseResponseDto } from './base.response';

/**
 * User response DTO - Safe to return to clients
 * Excludes password and sensitive information
 */
export class UserResponseDto extends BaseResponseDto {
  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'First name' })
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  lastName: string;

  @ApiProperty({ description: 'System role' })
  role: string;

  @ApiProperty({ description: 'Account active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Email verified status' })
  emailVerified: boolean;

  @ApiProperty({ description: 'Last login timestamp', nullable: true })
  lastLoginAt?: Date | null;

  /**
   * NEVER return password to clients
   */
  @Exclude()
  password: string;

  /**
   * NEVER return this - used for 2FA
   */
  @Exclude()
  totpSecret?: string | null;

  /**
   * NEVER return this - used for magic links
   */
  @Exclude()
  magicLinkToken?: string | null;
}

/**
 * User list response (minimal info)
 */
export class UserListResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'Full name' })
  fullName: string;

  @ApiProperty({ description: 'System role' })
  role: string;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;
}
