import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DuplicateChallengeDto {
  @ApiPropertyOptional({ description: 'Custom title for the cloned scenario', example: 'SQL Nightmare (Clone)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({ description: 'Custom slug for the cloned scenario', example: 'sql-nightmare-clone' })
  @IsOptional()
  @IsString()
  slug?: string;
}
