import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import {
  Roles,
  ApiOperationDecorator,
  ApiResponseType,
} from '@/common/decorators';
import { SystemRole } from '@prisma/client';
import { AclService } from './acl.service';
import { GrantAccessDto, CheckAccessDto } from './dto';

@ApiTags('ACL - Access Control')
@Controller('acl')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AclController {
  constructor(private aclService: AclService) {}

  @Post('grant')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Grant access to resource',
    description: 'Grant user access to a specific resource',
    bodyType: GrantAccessDto,
    exclude: [ApiResponseType.BadRequest, ApiResponseType.Unauthorized],
  })
  async grantAccess(@Body() dto: GrantAccessDto) {
    return this.aclService.grantAccess(dto);
  }

  @Post('check')
  @ApiOperationDecorator({
    summary: 'Check user access to resource',
    description: 'Verify if user has access to a specific resource',
    bodyType: CheckAccessDto,
    exclude: [ApiResponseType.BadRequest],
  })
  async checkAccess(@Body() dto: CheckAccessDto) {
    const hasAccess = await this.aclService.checkAccess(dto);
    return { hasAccess };
  }

  @Get('resource/:resourceType/:resourceId')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Get all ACL rules for a resource',
    description: 'Retrieve all access control rules for a specific resource',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async getResourceAcls(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.aclService.getResourceAcls(resourceType, resourceId);
  }

  @Get('user/:userId/resources')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Get user resources with access',
    description: 'List all resources that user has access to',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async findUserResources(
    @Param('userId') userId: string,
    @Query('resourceType') resourceType: string,
  ) {
    return this.aclService.findUserResources(userId, resourceType);
  }

  @Get('user/:userId/resource/:resourceType/:resourceId')
  @ApiOperationDecorator({
    summary: 'Get user access to specific resource',
    description: 'Retrieve user permissions on a specific resource',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async getUserResourceAccess(
    @Param('userId') userId: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.aclService.getUserResourceAccess(
      userId,
      resourceType,
      resourceId,
    );
  }

  @Delete('revoke/:userId/:resourceType/:resourceId/:action')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Revoke access',
    description: 'Revoke user access to a resource',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async revokeAccess(
    @Param('userId') userId: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.aclService.revokeAccess(userId, resourceType, resourceId);
  }

  @Delete('revoke-all/:userId/:resourceType/:resourceId')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Revoke all access to resource',
    description: 'Remove all user access rights to a resource',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async revokeAllUserResourceAccess(
    @Param('userId') userId: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.aclService.revokeAllUserResourceAccess(
      userId,
      resourceType,
      resourceId,
    );
  }

  @Delete('resource/:resourceType/:resourceId')
  @Roles(SystemRole.ADMIN)
  @ApiOperationDecorator({
    summary: 'Delete all ACL rules for resource',
    description: 'Remove all access control rules for a resource',
    exclude: [ApiResponseType.BadRequest, ApiResponseType.NotFound],
  })
  async deleteResourceAcls(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.aclService.deleteResourceAcls(resourceType, resourceId);
  }
}
