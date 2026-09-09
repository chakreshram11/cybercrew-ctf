import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Platform Health and Telemetry Check' })
  @ApiResponse({
    status: 200,
    description: 'System is operational and ready to serve requests.',
  })
  check() {
    return {
      status: 'operational',
      service: 'cybercrew-ctf-backend',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
