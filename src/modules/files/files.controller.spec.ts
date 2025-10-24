import { Test, TestingModule } from '@nestjs/testing';
import {
  CanActivate,
  ExecutionContext,
  NestInterceptor,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '@/common/guards';
import { IdempotencyInterceptor } from '@/common/interceptors';

class AllowAuthGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext): boolean {
    return true;
  }
}
class NoopIdem implements NestInterceptor {
  intercept(_c: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle();
  }
}

describe('FilesController (unit)', () => {
  let controller: FilesController;
  const filesService = {
    presignPut: jest.fn(),
    presignPost: jest.fn(),
    complete: jest.fn(),
    createThumbnail: jest.fn(),
    presignGetForDownload: jest.fn(),
    deleteFile: jest.fn(),
    attachPublicUrl: (x: any) => x,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [{ provide: FilesService, useValue: filesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowAuthGuard)
      .overrideInterceptor(IdempotencyInterceptor)
      .useClass(NoopIdem)
      .compile();

    controller = module.get<FilesController>(FilesController);
    jest.clearAllMocks();
  });

  it('presign-put calls service', async () => {
    filesService.presignPut.mockResolvedValue({ url: 'u' });
    const out = await controller.presignPut({
      filename: 'a.jpg',
      mime: 'image/jpeg',
    } as any);
    expect(filesService.presignPut).toHaveBeenCalledWith(
      'a.jpg',
      'image/jpeg',
      undefined,
    );
    expect(out).toEqual({ url: 'u' });
  });

  it('presign-post calls service', async () => {
    filesService.presignPost.mockResolvedValue({ url: 'u' });
    const out = await controller.presignPost({
      filename: 'a.jpg',
      mime: 'image/jpeg',
    } as any);
    expect(filesService.presignPost).toHaveBeenCalled();
    expect(out).toEqual({ url: 'u' });
  });

  it('complete returns file with public url', async () => {
    filesService.complete.mockResolvedValue({
      id: 'f1',
      key: 'k',
      status: 'READY',
    });
    const out = await controller.complete({ fileId: 'f1' } as any);
    expect(filesService.complete).toHaveBeenCalledWith('f1');
    expect(out.ok).toBe(true);
  });

  it('thumbnail returns updated file', async () => {
    filesService.createThumbnail.mockResolvedValue({
      id: 'f1',
      thumbKey: 'k.thumb.jpg',
    });
    const out = await controller.createThumbnail(
      { fileId: 'f1' } as any,
      { maxSize: 400 } as any,
    );
    expect(filesService.createThumbnail).toHaveBeenCalledWith('f1', 400);
    expect(out.ok).toBe(true);
  });

  it('download uses suggested filename when not provided', async () => {
    filesService.complete.mockResolvedValue({
      id: 'f1',
      key: 'uploads/f1/a.jpg',
    });
    filesService.presignGetForDownload.mockResolvedValue({
      url: 'dl',
      expiresIn: 600,
    });
    const out = await controller.presignDownload(
      { fileId: 'f1' } as any,
      {} as any,
    );
    expect(filesService.presignGetForDownload).toHaveBeenCalledWith(
      'uploads/f1/a.jpg',
      'a.jpg',
      600,
    );
    expect(out).toEqual({ ok: true, url: 'dl', expiresIn: 600 });
  });

  it('delete calls service with force', async () => {
    filesService.deleteFile.mockResolvedValue({ ok: true, deleted: 'f1' });
    const out = await controller.deleteFile(
      { fileId: 'f1' } as any,
      { force: true } as any,
    );
    expect(filesService.deleteFile).toHaveBeenCalledWith('f1', true);
    expect(out).toEqual({ ok: true, deleted: 'f1' });
  });
});
