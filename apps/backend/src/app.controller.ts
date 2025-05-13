import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('default')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get a hello message' })
  @ApiResponse({ status: 200, description: 'Returns a hello message.', type: String })
  getHello(): string {
    return this.appService.getHello();
  }
}
