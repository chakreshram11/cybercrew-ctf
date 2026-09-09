import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BadgesService } from './badges.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Badges')
@ApiBearerAuth()
@Controller()
export class BadgesController {
  constructor(private badgesService: BadgesService) {}

  @Get('badges')
  @Public()
  @ApiOperation({ summary: 'Retrieve catalog of competition achievement badges' })
  async listBadges() {
    return this.badgesService.listBadges();
  }

  @Get('teams/:teamId/badges')
  @Public()
  @ApiOperation({ summary: 'Retrieve badges earned by a squad' })
  async getTeamBadges(@Param('teamId') teamId: string) {
    return this.badgesService.getTeamBadges(teamId);
  }

  @Post('teams/:teamId/badges/evaluate')
  @ApiOperation({ summary: 'Evaluate and award qualifying badges to a squad' })
  async evaluateBadges(@Param('teamId') teamId: string) {
    return this.badgesService.evaluateAndAward(teamId);
  }
}
