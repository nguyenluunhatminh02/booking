import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FilesController } from './files.controller';
import { FilesService } from '@/modules/files/files.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
