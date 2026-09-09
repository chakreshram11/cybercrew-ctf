import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller()
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Get('announcements')
  @Public()
  @ApiOperation({ summary: 'List all published competition broadcasts' })
  async listPublishedAnnouncements() {
    return this.announcementsService.listPublishedAnnouncements();
  }

  // Administrative Endpoints
  @Get('admin/announcements')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Administrative overview of all announcements' })
  async adminListAnnouncements() {
    return this.announcementsService.adminListAnnouncements();
  }

  @Post('admin/announcements')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create and dispatch a competition announcement' })
  async createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.createAnnouncement(dto);
  }

  @Patch('admin/announcements/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update an existing announcement' })
  async updateAnnouncement(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.updateAnnouncement(id, dto);
  }

  @Delete('admin/announcements/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Permanently remove an announcement' })
  async deleteAnnouncement(@Param('id') id: string) {
    return this.announcementsService.deleteAnnouncement(id);
  }
}
