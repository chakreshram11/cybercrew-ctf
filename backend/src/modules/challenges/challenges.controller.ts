import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { DuplicateChallengeDto } from './dto/duplicate-challenge.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Challenges')
@ApiBearerAuth()
@Controller()
export class ChallengesController {
  constructor(private challengesService: ChallengesService) {}

  @Get('challenges')
  @Public()
  @ApiOperation({ summary: 'List all published and active challenges for participants' })
  async listPublicChallenges(@CurrentUser() user?: AuthUser) {
    return this.challengesService.listPublicChallenges(user);
  }

  @Get('challenges/:slug')
  @Public()
  @ApiOperation({ summary: 'Retrieve challenge detail dossier by slug' })
  async getPublicChallengeBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.challengesService.getPublicChallengeBySlug(slug, user);
  }

  // Administrative Endpoints
  @Get('admin/challenges')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CHALLENGE_AUTHOR')
  @ApiOperation({ summary: 'Administrative inventory of all challenges across lifecycle states' })
  async adminListChallenges() {
    return this.challengesService.adminListChallenges();
  }

  @Post('admin/challenges')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CHALLENGE_AUTHOR')
  @ApiOperation({ summary: 'Create a new challenge scenario' })
  async createChallenge(
    @Body() dto: CreateChallengeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.challengesService.createChallenge(dto, user.id);
  }

  @Patch('admin/challenges/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CHALLENGE_AUTHOR')
  @ApiOperation({ summary: 'Update an existing challenge scenario' })
  async updateChallenge(
    @Param('id') id: string,
    @Body() dto: UpdateChallengeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.challengesService.updateChallenge(id, dto, user);
  }

  @Post('admin/challenges/:id/duplicate')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CHALLENGE_AUTHOR')
  @ApiOperation({ summary: 'Duplicate an existing challenge scenario into DRAFT' })
  async duplicateChallenge(
    @Param('id') id: string,
    @Body() dto: DuplicateChallengeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.challengesService.duplicateChallenge(id, dto, user);
  }

  @Delete('admin/challenges/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Permanently remove a challenge scenario' })
  async deleteChallenge(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.challengesService.deleteChallenge(id, user);
  }
}
