import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Files')
@ApiBearerAuth()
@Controller()
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Get('challenges/:challengeId/files')
  @Public()
  @ApiOperation({ summary: 'List downloadable file artifacts for challenge scenario' })
  async listFiles(@Param('challengeId') challengeId: string) {
    return this.filesService.listChallengeFiles(challengeId);
  }

  @Get('challenges/files/:fileId/download')
  @Public()
  @ApiOperation({ summary: 'Generate time-limited signed download URL for challenge artifact' })
  async getDownloadUrl(
    @Param('fileId') fileId: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.filesService.getDownloadUrl(fileId, user);
  }

  // Administrative Endpoints
  @Post('admin/challenges/:challengeId/files')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CHALLENGE_AUTHOR')
  @ApiOperation({ summary: 'Register uploaded challenge artifact' })
  async registerFile(
    @Param('challengeId') challengeId: string,
    @Body() dto: CreateFileDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.filesService.registerFile(challengeId, dto, user);
  }

  @Delete('admin/files/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Permanently remove a challenge artifact' })
  async deleteFile(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.filesService.deleteFile(id, user);
  }
}
