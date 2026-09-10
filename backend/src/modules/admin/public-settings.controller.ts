import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Settings')
@Controller('settings')
export class PublicSettingsController {
  constructor(private adminService: AdminService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Retrieve public competition event schedule and metadata' })
  async getPublicSettings() {
    const settings = await this.adminService.getCompetitionSettings();
    return {
      ctf_name: settings.ctf_name,
      description: settings.description,
      start_date: settings.start_date,
      end_date: settings.end_date,
      timezone: settings.timezone || 'Asia/Kolkata',
      state: settings.state,
      registration_open: settings.registration_open,
      scoreboard_frozen: settings.scoreboard_frozen,
    };
  }
}
