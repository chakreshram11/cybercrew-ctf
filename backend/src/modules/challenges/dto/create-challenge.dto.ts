import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type ChallengeType =
  | 'STATIC'
  | 'WEB'
  | 'NETWORK'
  | 'PWN'
  | 'REVERSE'
  | 'CRYPTO'
  | 'FORENSICS'
  | 'OSINT'
  | 'LINUX'
  | 'WINDOWS'
  | 'MOBILE'
  | 'CLOUD'
  | 'AI_SECURITY'
  | 'MISC';

export type ChallengeStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ACTIVE'
  | 'DISABLED'
  | 'ARCHIVED';

export class CreateChallengeDto {
  @ApiProperty({ description: 'Challenge title', example: 'SQL Nightmare' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  name: string;

  @ApiPropertyOptional({ description: 'Custom slug (auto-generated if omitted)', example: 'sql-nightmare' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ description: 'Category UUID', example: '11111111-1111-1111-1111-111111111101' })
  @IsNotEmpty()
  @Matches(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    { message: 'category_id must be a valid UUID format' },
  )
  category_id: string;

  @ApiProperty({ description: 'Challenge briefing in Markdown', example: 'Extract the admin token from the database.' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ enum: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'], example: 'EASY' })
  @IsNotEmpty()
  @IsEnum(['EASY', 'MEDIUM', 'HARD', 'EXPERT'])
  difficulty: ChallengeDifficulty;

  @ApiProperty({
    enum: [
      'STATIC',
      'WEB',
      'NETWORK',
      'PWN',
      'REVERSE',
      'CRYPTO',
      'FORENSICS',
      'OSINT',
      'LINUX',
      'WINDOWS',
      'MOBILE',
      'CLOUD',
      'AI_SECURITY',
      'MISC',
    ],
    example: 'WEB',
  })
  @IsNotEmpty()
  @IsEnum([
    'STATIC',
    'WEB',
    'NETWORK',
    'PWN',
    'REVERSE',
    'CRYPTO',
    'FORENSICS',
    'OSINT',
    'LINUX',
    'WINDOWS',
    'MOBILE',
    'CLOUD',
    'AI_SECURITY',
    'MISC',
  ])
  challenge_type: ChallengeType;

  @ApiPropertyOptional({ description: 'Base points value', default: 500, example: 500 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(10000)
  base_points?: number;

  @ApiPropertyOptional({ description: 'Minimum dynamic points threshold', default: 100, example: 100 })
  @IsOptional()
  @IsInt()
  @Min(10)
  minimum_points?: number;

  @ApiPropertyOptional({ description: 'First blood bonus points', default: 50, example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  first_blood_bonus?: number;

  @ApiPropertyOptional({ description: 'Production flag string (will be HMAC-hashed server-side)', example: 'CCCTF{sample_flag}' })
  @IsOptional()
  @IsString()
  flag?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ACTIVE', 'DISABLED', 'ARCHIVED'], default: 'ACTIVE' })
  @IsOptional()
  @IsEnum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ACTIVE', 'DISABLED', 'ARCHIVED'])
  status?: ChallengeStatus;

  @ApiPropertyOptional({ description: 'Live Target URL', example: 'https://web01.ctf.cybercrew.online' })
  @IsOptional()
  @IsString()
  target_url?: string;

  @ApiPropertyOptional({ description: 'Live Target TCP Host', example: 'pwn01.ctf.cybercrew.online' })
  @IsOptional()
  @IsString()
  target_host?: string;

  @ApiPropertyOptional({ description: 'Live Target TCP Port', example: 1337 })
  @IsOptional()
  @IsInt()
  target_port?: number;
}
