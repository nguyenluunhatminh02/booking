import { Module } from '@nestjs/common';
import { EmailService } from '@/common/services/email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
