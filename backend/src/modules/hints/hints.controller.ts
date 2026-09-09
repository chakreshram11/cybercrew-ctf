import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HintsService } from './hints.service';
import { CreateHintDto } from './dto/create-hint.dto';
import { UpdateHintDto } from './dto/update-hint.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Hints')
@ApiBearerAuth()
@Controller()
export class HintsController {
  constructor(private hintsService: HintsService) {}

  @Post('challenges/:challengeId/hints/:hintId/unlock')
  @ApiOperation({ summary: 'Unlock challenge hint atomically with score ledger deduction' })
  async unlockHint(
    @Param('challengeId') challengeId: string,
    @Param('hintId') hintId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.hintsService.unlockHint(challengeId, hintId, user);
  }

  // Administrative Endpoints
  @Get('admin/hints')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CHALLENGE_AUTHOR')
  @ApiOperation({ summary: 'Administrative overview of all configured intelligence hints' })
  async adminListHints() {
    return this.hintsService.adminListHints();
  }

  @Post('admin/challenges/:challengeId/hints')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CHALLENGE_AUTHOR')
  @ApiOperation({ summary: 'Create a new hint for a challenge scenario' })
  async createHint(
    @Param('challengeId') challengeId: string,
    @Body() dto: CreateHintDto,
  ) {
    return this.hintsService.createHint(challengeId, dto);
  }

  @Patch('admin/hints/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CHALLENGE_AUTHOR')
  @ApiOperation({ summary: 'Update an existing intelligence hint' })
  async updateHint(
    @Param('id') id: string,
    @Body() dto: UpdateHintDto,
  ) {
    return this.hintsService.updateHint(id, dto);
  }

  @Delete('admin/hints/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete an intelligence hint' })
  async deleteHint(@Param('id') id: string) {
    return this.hintsService.deleteHint(id);
  }
}
