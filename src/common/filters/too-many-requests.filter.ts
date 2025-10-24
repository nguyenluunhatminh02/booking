// src/common/filters/too-many-requests.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class TooManyRequestsFilter implements ExceptionFilter {
  catch(err: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    const status =
      err instanceof HttpException && typeof err.getStatus === 'function'
        ? err.getStatus()
        : err?.status;

    const is429 = Number(status) === Number(HttpStatus.TOO_MANY_REQUESTS);

    if (!is429) throw err; // nhường filter khác xử lý

    // Nếu có header Retry-After đã set từ guard, giữ nguyên
    const retry = res.getHeader?.('Retry-After');

    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Bạn gửi quá nhanh, vui lòng thử lại sau.',
        // bạn có thể thêm plan, route, key, v.v.
      },
      retryAfter: retry ? Number(retry) : undefined, // giây
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
