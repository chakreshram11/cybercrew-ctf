import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type EventState =
  | 'DRAFT'
  | 'REGISTRATION_OPEN'
  | 'UPCOMING'
  | 'LIVE'
  | 'ENDED'
  | 'ARCHIVED';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'Official competition title', example: 'Cyber Crew CTF 2026' })
  @IsOptional()
  @IsString()
  ctf_name?: string;

  @ApiPropertyOptional({ description: 'Briefing description of event', example: 'National cyber defense drill.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Event start timestamp (UTC)', example: '2026-10-15T09:00:00Z' })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'Event end timestamp (UTC)', example: '2026-10-17T21:00:00Z' })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Competition timezone', example: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    enum: ['DRAFT', 'REGISTRATION_OPEN', 'UPCOMING', 'LIVE', 'ENDED', 'ARCHIVED'],
    example: 'LIVE',
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'REGISTRATION_OPEN', 'UPCOMING', 'LIVE', 'ENDED', 'ARCHIVED'])
  state?: EventState;

  @ApiPropertyOptional({ description: 'Registration enrollment status switch', example: true })
  @IsOptional()
  @IsBoolean()
  registration_open?: boolean;

  @ApiPropertyOptional({ description: 'Maximum operatives permitted per squad', example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  max_team_size?: number;

  @ApiPropertyOptional({ description: 'Minimum operatives required per squad', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  min_team_size?: number;

  @ApiPropertyOptional({ description: 'Permit squads to incur negative scores from hints', example: false })
  @IsOptional()
  @IsBoolean()
  allow_negative_scores?: boolean;

  @ApiPropertyOptional({ description: 'Enable dynamic solve count point decay', example: true })
  @IsOptional()
  @IsBoolean()
  dynamic_scoring_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable First Blood bonus rewards', example: true })
  @IsOptional()
  @IsBoolean()
  first_blood_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable intelligence hint purchases', example: true })
  @IsOptional()
  @IsBoolean()
  hints_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Freeze public scoreboard', example: false })
  @IsOptional()
  @IsBoolean()
  scoreboard_frozen?: boolean;

  @ApiPropertyOptional({ description: 'Timestamp at which scores freeze', example: '2026-10-17T18:00:00Z' })
  @IsOptional()
  @IsString()
  freeze_time?: string;

  @ApiPropertyOptional({ description: 'Submission rate limit attempts per minute', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  submission_rate_limit?: number;

  @ApiPropertyOptional({ description: 'Emergency maintenance mode switch', example: false })
  @IsOptional()
  @IsBoolean()
  maintenance_mode?: boolean;
}
