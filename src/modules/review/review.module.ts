import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { ContentModerationService } from './content-moderation.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [PrismaModule, IdempotencyModule, OutboxModule],
  controllers: [ReviewController],
  providers: [ReviewService, ContentModerationService],
  exports: [ReviewService, ContentModerationService],
})
export class ReviewModule {}
