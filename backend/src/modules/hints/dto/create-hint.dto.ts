import { IsString, IsNotEmpty, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHintDto {
  @ApiProperty({ description: 'Hint title', example: 'Examine Input Sanitization' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Intelligence hint content', example: 'Check for parameter pollution in the query string.' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Point deduction cost', example: 50, default: 0 })
  @IsInt()
  @Min(0)
  cost: number;

  @ApiPropertyOptional({ description: 'Display order sequence', example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
