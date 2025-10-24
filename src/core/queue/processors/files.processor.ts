import { FilesService } from '@/modules/files/files.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface FilesJobData {
  type: 'thumbnail' | 'compress' | 'convert';
  fileId: string;
  options?: {
    maxSize?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  };
}

/**
 * Files Queue Processor
 * Xử lý async: thumbnail / (compress / convert future)
 */
@Processor('files', { concurrency: 3 })
export class FilesProcessor extends WorkerHost {
  constructor(
    private readonly filesService: FilesService,
    @InjectPinoLogger(FilesProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job<FilesJobData>): Promise<void> {
    const type = job.data?.type ?? (job.name as FilesJobData['type']);
    const { fileId, options } = job.data;

    this.logger.info({ jobId: job.id, type, fileId }, 'Processing file job');

    try {
      switch (type) {
        case 'thumbnail':
          await this.filesService.createThumbnail(
            fileId,
            options?.maxSize ?? 512,
          );
          break;

        case 'compress':
          // TODO: implement
          this.logger.warn({ fileId }, 'Compression not yet implemented');
          break;

        case 'convert':
          // TODO: implement
          this.logger.warn({ fileId }, 'Conversion not yet implemented');
          break;

        default:
          throw new Error(`Unknown file operation type: ${type}`);
      }

      this.logger.info({ jobId: job.id, type, fileId }, 'File job completed');
    } catch (error) {
      this.logger.error(
        { jobId: job.id, type, fileId, error },
        'File job failed',
      );
      throw error; // để BullMQ retry
    }
  }
}
