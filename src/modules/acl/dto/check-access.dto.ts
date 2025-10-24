import { IsString, IsOptional } from 'class-validator';

export class CheckAccessDto {
  @IsString()
  userId: string;

  @IsString()
  resourceType: string;

  @IsString()
  resourceId: string;

  @IsString()
  action: string;

  @IsOptional()
  context?: Record<string, any>;
}
