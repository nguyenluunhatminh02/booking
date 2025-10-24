import { IsString, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  action: string;

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  desc?: string;
}
