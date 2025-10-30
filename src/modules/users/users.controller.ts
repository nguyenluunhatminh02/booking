import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '@/common/dto';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import {
  Roles,
  Public,
  ApiOperationDecorator,
  ApiResponseType,
} from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseUUIDPipe } from '@/common/pipes';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 users per minute
  @ApiOperationDecorator({
    summary: 'Create a new user',
    bodyType: CreateUserDto,
    exclude: [ApiResponseType.Unauthorized, ApiResponseType.Forbidden],
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('ADMIN', 'MODERATOR')
  @Throttle({ default: { ttl: 60000, limit: 100 } }) // 100 requests per minute
  @ApiOperationDecorator({
    summary: 'Get all users with pagination',
    description: 'Retrieve all users with pagination support',
    exclude: [ApiResponseType.BadRequest],
  })
  async findAll(@Query() pagination: PaginationDto) {
    return this.usersService.findAll(pagination);
  }

  @Get('stats/by-role')
  @Roles('ADMIN')
  @SkipThrottle() // No rate limit for stats
  @ApiOperationDecorator({
    summary: 'Get user count by role',
    description: 'Get count of users grouped by role',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.TooManyRequests],
  })
  async countByRole() {
    return this.usersService.countByRole();
  }

  // ===== Current authenticated user =====
  @Get('me')
  @Roles('ADMIN', 'MODERATOR', 'USER')
  @SkipThrottle()
  @ApiOperationDecorator({
    summary: 'Get current authenticated user',
    description: 'Retrieve profile of currently authenticated user',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.TooManyRequests],
  })
  async getProfile(@Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  @Roles('ADMIN', 'MODERATOR', 'USER')
  @Throttle({ default: { ttl: 60000, limit: 200 } }) // 200 requests per minute
  @ApiOperationDecorator({
    summary: 'Get user by ID',
    description: 'Retrieve user details by their ID',
    exclude: [ApiResponseType.BadRequest],
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'USER')
  @Throttle({ default: { ttl: 60000, limit: 20 } }) // 20 updates per minute
  @ApiOperationDecorator({
    summary: 'Update user',
    description: 'Update user profile information',
    bodyType: UpdateUserDto,
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Unauthorized],
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Throttle({ default: { ttl: 60000, limit: 30 } }) // 30 deletes per minute
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperationDecorator({
    summary: 'Soft delete user (set inactive)',
    description:
      'Soft delete user - marks user as inactive without removing data',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Unauthorized],
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
  }

  @Delete(':id/hard')
  @Roles('ADMIN')
  @Throttle({ default: { ttl: 3600000, limit: 5 } }) // 5 hard deletes per hour
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperationDecorator({
    summary: 'Permanently delete user (Admin only)',
    description:
      'Permanently delete user and all associated data - irreversible operation',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Unauthorized],
  })
  async hardDelete(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.hardDelete(id);
  }

  @Post(':id/verify-email')
  @Roles('ADMIN')
  @Throttle({ default: { ttl: 60000, limit: 50 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperationDecorator({
    summary: 'Verify user email (Admin only)',
    description: 'Manually verify a user email address',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async verifyEmail(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.verifyEmail(id);
    return { message: 'Email verified successfully' };
  }
}
