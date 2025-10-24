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
import { Roles } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseUUIDPipe } from '@/common/pipes';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN')
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 users per minute
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('ADMIN', 'MODERATOR')
  @Throttle({ default: { ttl: 60000, limit: 100 } }) // 100 requests per minute
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.usersService.findAll(pagination);
  }

  @Get('stats/by-role')
  @Roles('ADMIN')
  @SkipThrottle() // No rate limit for stats
  @ApiOperation({ summary: 'Get user count by role' })
  async countByRole() {
    return this.usersService.countByRole();
  }

  // ===== Current authenticated user =====
  @Get('me')
  @Roles('ADMIN', 'MODERATOR', 'USER')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getProfile(@Req() req: any) {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  @Roles('ADMIN', 'MODERATOR', 'USER')
  @Throttle({ default: { ttl: 60000, limit: 200 } }) // 200 requests per minute
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'USER')
  @Throttle({ default: { ttl: 60000, limit: 20 } }) // 20 updates per minute
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
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
  @ApiOperation({ summary: 'Soft delete user (set inactive)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
  }

  @Delete(':id/hard')
  @Roles('ADMIN')
  @Throttle({ default: { ttl: 3600000, limit: 5 } }) // 5 hard deletes per hour
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete user (Admin only)' })
  @ApiResponse({ status: 204, description: 'User permanently deleted' })
  async hardDelete(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.hardDelete(id);
  }

  @Post(':id/verify-email')
  @Roles('ADMIN')
  @Throttle({ default: { ttl: 60000, limit: 50 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email (Admin only)' })
  async verifyEmail(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.verifyEmail(id);
    return { message: 'Email verified successfully' };
  }
}
