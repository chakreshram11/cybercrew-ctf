import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { JoinTeamDto } from './dto/join-team.dto';
import { TransferCaptainDto } from './dto/transfer-captain.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Teams')
@ApiBearerAuth()
@Controller()
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get('teams')
  @Public()
  @ApiOperation({ summary: 'List all registered competition squads' })
  async listTeams(@Query('search') search?: string) {
    return this.teamsService.listTeams(search);
  }

  @Post('teams')
  @ApiOperation({ summary: 'Establish a new competition squad' })
  async createTeam(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teamsService.createTeam(user, dto);
  }

  @Post('teams/join')
  @ApiOperation({ summary: 'Enlist in a squad via cryptographic invitation code' })
  async joinTeam(@CurrentUser() user: AuthUser, @Body() dto: JoinTeamDto) {
    return this.teamsService.joinTeam(user, dto);
  }

  @Get('teams/:slug')
  @Public()
  @ApiOperation({ summary: 'Retrieve squad dossier by slug' })
  async getTeamBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.teamsService.getTeamBySlug(slug, user);
  }

  @Get('teams/:slug/invite-code')
  @ApiOperation({ summary: 'Retrieve squad invitation code (Captain/Admin only)' })
  async getInviteCode(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teamsService.getInviteCode(slug, user);
  }

  @Post('teams/:id/regenerate-code')
  @ApiOperation({ summary: 'Regenerate squad invitation code (Captain/Admin only)' })
  async regenerateInviteCode(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teamsService.regenerateInviteCode(id, user);
  }

  @Post('teams/:id/transfer-captain')
  @ApiOperation({ summary: 'Transfer squad command to another member (Captain only)' })
  async transferCaptain(
    @Param('id') id: string,
    @Body() dto: TransferCaptainDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teamsService.transferCaptain(id, dto.target_user_id, user);
  }

  @Post('teams/:id/leave')
  @ApiOperation({ summary: 'Discharge operative from squad' })
  async leaveTeam(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teamsService.leaveTeam(id, user);
  }

  @Get('teams/:slug/score-history')
  @Public()
  @ApiOperation({ summary: 'Retrieve immutable score ledger events for squad' })
  async getTeamScoreHistory(@Param('slug') slug: string) {
    return this.teamsService.getTeamScoreHistory(slug);
  }

  @Get('teams/:slug/solves')
  @Public()
  @ApiOperation({ summary: 'Retrieve confirmed solves for squad' })
  async getTeamSolves(@Param('slug') slug: string) {
    return this.teamsService.getTeamSolves(slug);
  }

  // Administrative Endpoints
  @Get('admin/teams')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Administrative squad overview' })
  async adminListTeams(@Query('search') search?: string) {
    return this.teamsService.listTeams(search);
  }

  @Post('admin/teams/:id/adjust-score')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Arbitrate and adjust squad score (Audited transaction)' })
  async adminAdjustScore(
    @Param('id') id: string,
    @Body('points') points: number,
    @Body('reason') reason: string,
    @CurrentUser() adminUser: AuthUser,
  ) {
    return this.teamsService.adminAdjustScore(id, Number(points), reason, adminUser);
  }
}
