import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFileDto {
  @ApiProperty({ description: 'Original artifact filename', example: 'dump.pcap' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Filename contains disallowed characters. Only alphanumeric, dots, underscores, and dashes allowed.',
  })
  file_name: string;

  @ApiProperty({ description: 'Artifact size in bytes (max 50MB)', example: 1048576 })
  @IsInt()
  @Min(1)
  @Max(52428800) // 50MB limit
  file_size: number;

  @ApiProperty({ description: 'Object storage path / key', example: 'challenges/22222222/dump.pcap' })
  @IsNotEmpty()
  @IsString()
  file_path: string;

  @ApiPropertyOptional({ description: 'MIME Type', example: 'application/vnd.tcpdump.pcap' })
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiPropertyOptional({ description: 'Cryptographic SHA-256 integrity checksum', example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' })
  @IsOptional()
  @IsString()
  checksum_sha256?: string;
}
