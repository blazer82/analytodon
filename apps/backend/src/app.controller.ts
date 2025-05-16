import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';

@ApiTags('Hello World')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get a hello message' })
  @ApiResponse({
    status: 200,
    description: 'Returns a hello message.',
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
