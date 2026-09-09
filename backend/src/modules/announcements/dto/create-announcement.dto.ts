import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type AnnouncementSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export class CreateAnnouncementDto {
  @ApiProperty({ description: 'Announcement title', example: 'Target Service Maintenance Complete' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Announcement content text', example: 'Web challenge targets have been refreshed.' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    enum: ['INFO', 'SUCCESS', 'WARNING', 'CRITICAL'],
    default: 'INFO',
    example: 'INFO',
  })
  @IsOptional()
  @IsEnum(['INFO', 'SUCCESS', 'WARNING', 'CRITICAL'])
  severity?: AnnouncementSeverity;

  @ApiPropertyOptional({ description: 'Publication visibility flag', default: true })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}
