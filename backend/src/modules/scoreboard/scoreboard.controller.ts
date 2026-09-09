import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScoreboardService } from './scoreboard.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Scoreboard')
@ApiBearerAuth()
@Controller('scoreboard')
export class ScoreboardController {
  constructor(private scoreboardService: ScoreboardService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Retrieve official competition leaderboard ranking' })
  async getScoreboard(@CurrentUser() user?: AuthUser) {
    return this.scoreboardService.getScoreboard(user);
  }
}
