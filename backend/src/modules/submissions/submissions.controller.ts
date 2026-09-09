import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Ip,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SubmissionsService } from './submissions.service';
import { SubmitFlagDto } from './dto/submit-flag.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Submissions')
@ApiBearerAuth()
@Controller()
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('challenges/:challengeId/submit')
  @ApiOperation({ summary: 'Submit captured challenge flag for verification and scoring' })
  async submitFlag(
    @Param('challengeId') challengeId: string,
    @Body() dto: SubmitFlagDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const userAgent = req.get('user-agent') || 'Unknown';
    return this.submissionsService.submitFlag(
      challengeId,
      dto,
      user,
      ip || req.socket.remoteAddress || '127.0.0.1',
      userAgent,
    );
  }

  @Get('admin/submissions')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Audit log of all incoming flag submissions' })
  async adminListSubmissions() {
    return this.submissionsService.adminListSubmissions();
  }
}
