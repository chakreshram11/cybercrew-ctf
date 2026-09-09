import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category title', example: 'Web Exploitation' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  name: string;

  @ApiPropertyOptional({ description: 'Category briefing / description', example: 'XSS, SQLi, SSRF, Deserialization' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Display order priority', example: 1 })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ description: 'Active visibility status', example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
