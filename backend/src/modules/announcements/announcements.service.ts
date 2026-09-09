import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Retrieves all published announcements for participants.
   */
  async listPublishedAnnouncements() {
    const client = this.supabaseService.getClient();

    const { data: announcements, error } = await client
      .from('announcements')
      .select('id, title, content, severity, published_at, created_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to retrieve announcements.');
    }

    return announcements || [];
  }

  /**
   * Administrative view of all broadcasts.
   */
  async adminListAnnouncements() {
    const client = this.supabaseService.getClient();

    const { data: announcements, error } = await client
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to query administrative broadcasts.');
    }

    return announcements || [];
  }

  /**
   * Creates and dispatches a new broadcast announcement.
   */
  async createAnnouncement(dto: CreateAnnouncementDto) {
    const client = this.supabaseService.getClient();

    const { data: announcement, error } = await client
      .from('announcements')
      .insert({
        title: dto.title.trim(),
        content: dto.content.trim(),
        severity: dto.severity || 'INFO',
        is_published: dto.is_published ?? true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !announcement) {
      throw new InternalServerErrorException('Failed to publish announcement.');
    }

    this.logger.log(`Broadcast announcement dispatched: [${announcement.title}]`);
    return announcement;
  }

  /**
   * Updates an existing announcement.
   */
  async updateAnnouncement(id: string, dto: UpdateAnnouncementDto) {
    const client = this.supabaseService.getClient();

    const { data: updated, error } = await client
      .from('announcements')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new NotFoundException('Announcement not found or update failed.');
    }

    return updated;
  }

  /**
   * Permanently deletes an announcement.
   */
  async deleteAnnouncement(id: string) {
    const client = this.supabaseService.getClient();

    const { error } = await client.from('announcements').delete().eq('id', id);
    if (error) {
      throw new InternalServerErrorException('Failed to remove announcement.');
    }

    return { success: true, message: 'Announcement removed.' };
  }
}
