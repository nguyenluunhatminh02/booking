import { IsString, IsEnum, IsOptional, IsJSON } from 'class-validator';
import { ACLEffect } from '@prisma/client';

export class GrantAccessDto {
  @IsString()
  userId: string;

  @IsString()
  resourceType: string;

  @IsString()
  resourceId: string;

  @IsString()
  action: string;

  @IsEnum(ACLEffect)
  @IsOptional()
  effect?: ACLEffect = 'ALLOW';

  @IsOptional()
  @IsJSON()
  conditions?: Record<string, any>;
}
