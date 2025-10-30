import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import {
  Public,
  ApiOperationDecorator,
  ApiResponseType,
} from '@/common/decorators';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperationDecorator({
    summary: 'Health check',
    description: 'Check if the API is running and healthy',
    exclude: [
      ApiResponseType.BadRequest,
      ApiResponseType.Unauthorized,
      ApiResponseType.Forbidden,
    ],
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
