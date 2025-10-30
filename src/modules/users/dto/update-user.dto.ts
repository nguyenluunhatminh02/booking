import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { createUserSchema } from './create-user.dto';

const updateUserSchema = createUserSchema.partial().extend({
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});

export class UpdateUserDto extends createZodDto(updateUserSchema) {
  @ApiPropertyOptional({ example: true })
  isActive?: boolean;

  @ApiPropertyOptional({ example: true })
  emailVerified?: boolean;
}

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
