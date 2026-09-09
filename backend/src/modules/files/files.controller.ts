import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
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
  @Post('admin/challenges/:challengeId/files/upload')
  @Roles('ADMIN', 'SUPER_ADMIN', 'CHALLENGE_AUTHOR')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file artifact directly to storage and register in challenge' })
  async uploadFile(
    @Param('challengeId') challengeId: string,
    @UploadedFile() file: any,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file payload attached to upload request.');
    }
    return this.filesService.uploadFile(
      challengeId,
      {
        originalname: file.originalname,
        buffer: file.buffer,
        size: file.size,
        mimetype: file.mimetype,
      },
      user,
    );
  }

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
