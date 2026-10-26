import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { HealthService, type HealthCheckResult } from './health.service.js';

@ApiTags('System & Observability')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Kiểm tra trạng thái kết nối Database, Redis và tài nguyên server',
  })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái hoạt động của các dịch vụ hạ tầng',
  })
  async check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}

