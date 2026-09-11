import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform telemetry & competition aggregate metrics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('challenges/:id/analytics')
  @ApiOperation({ summary: 'Deep analytics and solve timeline for a challenge' })
  async getChallengeAnalytics(@Param('id') id: string) {
    return this.adminService.getChallengeAnalytics(id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Administrative action audit trail' })
  async getAuditLogs(@Query('limit') limit?: number) {
    return this.adminService.getAuditLogs(limit ? Number(limit) : 100);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Retrieve competition parameters and switches' })
  async getSettings() {
    return this.adminService.getCompetitionSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update competition policies, event states, and limits' })
  async updateSettings(
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateCompetitionSettings(dto, user);
  }

  @Post('competition/reset')
  @ApiOperation({ summary: 'Complete competition score and progress reset' })
  async resetCompetition(@CurrentUser() user: AuthUser) {
    return this.adminService.resetCompetition(user);
  }
}
