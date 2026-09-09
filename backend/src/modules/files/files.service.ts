import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateFileDto } from './dto/create-file.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly ALLOWED_EXTENSIONS = new Set([
    'zip',
    'tar',
    'gz',
    '7z',
    'pdf',
    'pcap',
    'pcapng',
    'png',
    'jpg',
    'jpeg',
    'txt',
    'c',
    'cpp',
    'py',
    'sh',
    'bin',
    'asm',
    'elf',
    'raw',
    'vmem',
    'img',
  ]);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Validates file extension against strict CTF artifact allowlist (Section 37).
   */
  private validateExtension(filename: string) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (!this.ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Disallowed file type: .${ext}. Allowed extensions: ${Array.from(this.ALLOWED_EXTENSIONS).join(', ')}`,
      );
    }
  }

  /**
   * Retrieves all attachments for a challenge scenario.
   */
  async listChallengeFiles(challengeId: string) {
    const client = this.supabaseService.getClient();

    const { data: files, error } = await client
      .from('challenge_files')
      .select('id, challenge_id, file_name, file_size, file_path, mime_type, created_at')
      .eq('challenge_id', challengeId);

    if (error) {
      throw new InternalServerErrorException('Failed to retrieve challenge artifacts.');
    }

    return files || [];
  }

  /**
   * Generates a secure, time-limited signed URL from Supabase Storage for downloading (Section 68).
   */
  async getDownloadUrl(fileId: string, user?: AuthUser) {
    const client = this.supabaseService.getClient();

    const { data: file, error } = await client
      .from('challenge_files')
      .select(`
        id,
        file_name,
        file_path,
        challenge:challenges(id, is_published, is_active)
      `)
      .eq('id', fileId)
      .maybeSingle();

    if (error || !file) {
      throw new NotFoundException('Requested artifact not found.');
    }

    const isAdmin =
      user?.role === 'ADMIN' ||
      user?.role === 'SUPER_ADMIN' ||
      user?.role === 'CHALLENGE_AUTHOR';

    const challenge = file.challenge as any;
    if ((!challenge?.is_published || !challenge?.is_active) && !isAdmin) {
      throw new ForbiddenException('Artifact belongs to an unpublished challenge.');
    }

    // Generate signed download URL with 1-hour expiration
    const { data: signedUrlData, error: signError } = await client.storage
      .from('challenge-files')
      .createSignedUrl(file.file_path, 3600);

    if (signError || !signedUrlData) {
      // Fallback: return configured file_path directly if using public endpoint
      return {
        download_url: file.file_path,
        file_name: file.file_name,
        expires_in: 3600,
      };
    }

    return {
      download_url: signedUrlData.signedUrl,
      file_name: file.file_name,
      expires_in: 3600,
    };
  }

  /**
   * Registers a new uploaded file artifact in the database (Audited).
   */
  async registerFile(challengeId: string, dto: CreateFileDto, actor: AuthUser) {
    this.validateExtension(dto.file_name);
    const client = this.supabaseService.getClient();

    const { data: newFile, error } = await client
      .from('challenge_files')
      .insert({
        challenge_id: challengeId,
        file_name: dto.file_name,
        file_size: dto.file_size,
        file_path: dto.file_path,
        mime_type: dto.mime_type || 'application/octet-stream',
        checksum_sha256: dto.checksum_sha256,
      })
      .select()
      .single();

    if (error || !newFile) {
      this.logger.error(`Failed to record file artifact: ${error?.message}`);
      throw new InternalServerErrorException('Failed to register challenge artifact.');
    }

    // Audit log
    await client.from('audit_logs').insert({
      actor_id: actor.id,
      action: 'CHALLENGE_FILE_UPLOAD',
      resource_type: 'CHALLENGE_FILE',
      resource_id: newFile.id,
      metadata: { file_name: dto.file_name, challenge_id: challengeId },
    });

    return newFile;
  }

  /**
   * Permanently deletes a file attachment and removes storage object.
   */
  async deleteFile(fileId: string, actor: AuthUser) {
    const client = this.supabaseService.getClient();

    const { data: file } = await client
      .from('challenge_files')
      .select('file_name, file_path, challenge_id')
      .eq('id', fileId)
      .maybeSingle();

    if (!file) {
      throw new NotFoundException('Artifact not found.');
    }

    // Remove from storage bucket
    try {
      await client.storage.from('challenge-files').remove([file.file_path]);
    } catch {
      // Storage deletion failure should not block database cleanup
    }

    // Remove from database
    const { error } = await client.from('challenge_files').delete().eq('id', fileId);
    if (error) {
      throw new InternalServerErrorException('Failed to remove artifact record.');
    }

    // Audit log
    await client.from('audit_logs').insert({
      actor_id: actor.id,
      action: 'CHALLENGE_FILE_DELETE',
      resource_type: 'CHALLENGE_FILE',
      resource_id: fileId,
      metadata: { file_name: file.file_name, challenge_id: file.challenge_id },
    });

    return { success: true, message: 'Artifact removed.' };
  }
}
