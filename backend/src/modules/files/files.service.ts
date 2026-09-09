import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateFileDto } from './dto/create-file.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  // Centralized CTF Attachment Extension Allowlist
  private readonly ALLOWED_EXTENSIONS = new Set([
    // Images
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
    // Documents
    'pdf', 'txt', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    // Archives
    'zip', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'rar',
    // Audio
    'mp3', 'wav', 'ogg', 'flac', 'm4a',
    // Video
    'mp4', 'webm', 'mov', 'mkv',
    // Networking / Forensics
    'pcap', 'pcapng', 'cap', 'har', 'eml', 'evtx', 'reg', 'log', 'vmem', 'dmp', 'raw',
    // Data
    'json', 'xml', 'csv', 'yaml', 'yml',
    // Code / Source
    'py', 'js', 'ts', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'sh', 'ps1', 'sql', 'html', 'css', 'asm',
    // Security / CTF Binaries
    'bin', 'elf', 'exe', 'dll', 'apk', 'ipa', 'iso', 'img',
  ]);

  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {}

  /**
   * Sanitizes filenames to prevent path traversal & control character attacks.
   */
  public sanitizeFilename(filename: string): string {
    const basename = filename.replace(/^.*[\\\/]/, '');
    const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return sanitized || 'artifact.bin';
  }

  /**
   * Validates file extension against strict CTF artifact allowlist.
   */
  public validateExtension(filename: string) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (!this.ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Disallowed file extension: .${ext}. Allowed types include PNG, JPG, PDF, ZIP, 7Z, PCAP, PCAPNG, MP3, WAV, MP4, PY, JS, BIN, ELF, EXE, APK, ISO, and standard CTF artifacts.`,
      );
    }
  }

  /**
   * Magic-byte / Header Signature Validation for binary formats.
   */
  public validateFileHeader(buffer: Buffer, filename: string) {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('File payload is empty.');
    }

    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (ext === 'png') {
      if (buffer.length < 4 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47) {
        throw new BadRequestException('File header signature does not match valid PNG image format.');
      }
    } else if (ext === 'pdf') {
      if (buffer.length < 4 || buffer.toString('utf8', 0, 4) !== '%PDF') {
        throw new BadRequestException('File header signature does not match valid PDF document format.');
      }
    } else if (ext === 'zip' || ext === 'apk' || ext === 'jar' || ext === 'docx' || ext === 'xlsx' || ext === 'pptx') {
      if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
        throw new BadRequestException('File header signature does not match valid ZIP container format.');
      }
    } else if (ext === 'elf') {
      if (buffer.length < 4 || buffer[0] !== 0x7F || buffer[1] !== 0x45 || buffer[2] !== 0x4C || buffer[3] !== 0x46) {
        throw new BadRequestException('File header signature does not match valid ELF binary format.');
      }
    } else if (ext === 'exe' || ext === 'dll') {
      if (buffer.length < 2 || buffer[0] !== 0x4D || buffer[1] !== 0x5A) {
        throw new BadRequestException('File header signature does not match valid PE/DOS executable format.');
      }
    } else if (ext === 'pcap') {
      if (buffer.length < 4) {
        throw new BadRequestException('Invalid PCAP capture file payload.');
      }
      const magic = buffer.readUInt32LE(0);
      const magicBE = buffer.readUInt32BE(0);
      if (magic !== 0xa1b2c3d4 && magic !== 0xd4c3b2a1 && magicBE !== 0xa1b2c3d4 && magicBE !== 0xd4c3b2a1) {
        throw new BadRequestException('File header signature does not match valid PCAP capture format.');
      }
    } else if (ext === 'pcapng') {
      if (buffer.length < 4 || buffer[0] !== 0x0A || buffer[1] !== 0x0D || buffer[2] !== 0x0D || buffer[3] !== 0x0A) {
        throw new BadRequestException('File header signature does not match valid PCAPNG capture format.');
      }
    } else if (ext === 'gif') {
      if (buffer.length < 3 || buffer.toString('utf8', 0, 3) !== 'GIF') {
        throw new BadRequestException('File header signature does not match valid GIF image format.');
      }
    } else if (ext === 'jpg' || ext === 'jpeg') {
      if (buffer.length < 3 || buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
        throw new BadRequestException('File header signature does not match valid JPEG image format.');
      }
    } else if (ext === '7z') {
      if (buffer.length < 6 || buffer[0] !== 0x37 || buffer[1] !== 0x7A || buffer[2] !== 0xBC || buffer[3] !== 0xAF || buffer[4] !== 0x27 || buffer[5] !== 0x1C) {
        throw new BadRequestException('File header signature does not match valid 7z archive format.');
      }
    }
  }

  /**
   * Enforces configurable size and file count limits.
   */
  public validateFileSizeAndCount(fileSize: number, currentFileCount: number) {
    const maxMb = this.configService.get<number>('files.maxFileSizeMb') || 100;
    const maxFiles = this.configService.get<number>('files.maxFilesPerChallenge') || 20;

    const maxBytes = maxMb * 1024 * 1024;
    if (fileSize > maxBytes) {
      throw new BadRequestException(`File size exceeds maximum permitted limit (${maxMb} MB).`);
    }

    if (currentFileCount >= maxFiles) {
      throw new BadRequestException(`Maximum permitted files per challenge scenario reached (${maxFiles} files).`);
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
   * Generates a secure, time-limited signed URL from Supabase Storage for downloading.
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
   * Direct server-side upload handler: validates payload, uploads to Storage, and records in DB.
   */
  async uploadFile(
    challengeId: string,
    file: { originalname: string; buffer: Buffer; size: number; mimetype: string },
    actor: AuthUser,
  ) {
    const client = this.supabaseService.getClient();

    // Verify challenge exists
    const { data: challenge } = await client
      .from('challenges')
      .select('id, name')
      .eq('id', challengeId)
      .maybeSingle();

    if (!challenge) {
      throw new NotFoundException('Challenge scenario not found.');
    }

    // Check existing count
    const { count } = await client
      .from('challenge_files')
      .select('id', { count: 'exact', head: true })
      .eq('challenge_id', challengeId);

    const sanitized = this.sanitizeFilename(file.originalname);
    this.validateExtension(sanitized);
    this.validateFileSizeAndCount(file.size, count ?? 0);
    if (file.buffer) {
      this.validateFileHeader(file.buffer, sanitized);
    }

    // Upload to Supabase Storage with randomized object path
    const uniqueStoragePath = `challenges/${challengeId}/${crypto.randomUUID()}-${sanitized}`;
    const bucketName = 'challenge-files';

    const { error: storageError } = await client.storage
      .from(bucketName)
      .upload(uniqueStoragePath, file.buffer, {
        contentType: file.mimetype || 'application/octet-stream',
        upsert: true,
      });

    if (storageError) {
      this.logger.error(`Storage upload failed: ${storageError.message}`);
      throw new InternalServerErrorException('Failed to upload file artifact to storage.');
    }

    // Register file in DB
    const { data: newFile, error: dbError } = await client
      .from('challenge_files')
      .insert({
        challenge_id: challengeId,
        file_name: sanitized,
        file_size: file.size,
        file_path: uniqueStoragePath,
        mime_type: file.mimetype || 'application/octet-stream',
      })
      .select()
      .single();

    if (dbError || !newFile) {
      // Rollback storage object
      await client.storage.from(bucketName).remove([uniqueStoragePath]);
      throw new InternalServerErrorException('Failed to register challenge artifact in database.');
    }

    // Audit log
    await client.from('audit_logs').insert({
      actor_id: actor.id,
      action: 'CHALLENGE_FILE_UPLOAD',
      resource_type: 'CHALLENGE_FILE',
      resource_id: newFile.id,
      metadata: { file_name: sanitized, challenge_id: challengeId },
    });

    return newFile;
  }

  /**
   * Registers a new uploaded file artifact in the database (Audited).
   */
  async registerFile(challengeId: string, dto: CreateFileDto, actor: AuthUser) {
    const sanitized = this.sanitizeFilename(dto.file_name);
    this.validateExtension(sanitized);
    const client = this.supabaseService.getClient();

    const { count } = await client
      .from('challenge_files')
      .select('id', { count: 'exact', head: true })
      .eq('challenge_id', challengeId);

    this.validateFileSizeAndCount(dto.file_size || 0, count ?? 0);

    const { data: newFile, error } = await client
      .from('challenge_files')
      .insert({
        challenge_id: challengeId,
        file_name: sanitized,
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
      metadata: { file_name: sanitized, challenge_id: challengeId },
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

