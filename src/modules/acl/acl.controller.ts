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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
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
  @ApiOperation({ summary: 'Grant access to resource' })
  @ApiCreatedResponse({ description: 'Access granted' })
  async grantAccess(@Body() dto: GrantAccessDto) {
    return this.aclService.grantAccess(dto);
  }

  @Post('check')
  @ApiOperation({ summary: 'Check user access to resource' })
  @ApiOkResponse({ description: 'Access check result' })
  async checkAccess(@Body() dto: CheckAccessDto) {
    const hasAccess = await this.aclService.checkAccess(dto);
    return { hasAccess };
  }

  @Get('resource/:resourceType/:resourceId')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Get all ACL rules for a resource' })
  @ApiOkResponse({ description: 'List of ACL rules' })
  async getResourceAcls(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.aclService.getResourceAcls(resourceType, resourceId);
  }

  @Get('user/:userId/resources')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Get user resources with access' })
  @ApiOkResponse({ description: 'List of resources' })
  async findUserResources(
    @Param('userId') userId: string,
    @Query('resourceType') resourceType: string,
    @Query('action') action: string = 'read',
  ) {
    return this.aclService.findUserResources(userId, resourceType, action);
  }

  @Get('user/:userId/resource/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Get user access to specific resource' })
  @ApiOkResponse({ description: 'List of user permissions on resource' })
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
  @ApiOperation({ summary: 'Revoke access' })
  @ApiOkResponse({ description: 'Access revoked' })
  async revokeAccess(
    @Param('userId') userId: string,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Param('action') action: string,
  ) {
    return this.aclService.revokeAccess(
      userId,
      resourceType,
      resourceId,
      action,
    );
  }

  @Delete('revoke-all/:userId/:resourceType/:resourceId')
  @Roles(SystemRole.ADMIN)
  @ApiOperation({ summary: 'Revoke all access to resource' })
  @ApiOkResponse({ description: 'All access revoked' })
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
  @ApiOperation({ summary: 'Delete all ACL rules for resource' })
  @ApiOkResponse({ description: 'ACL rules deleted' })
  async deleteResourceAcls(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.aclService.deleteResourceAcls(resourceType, resourceId);
  }
}
