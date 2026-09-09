import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Operative display name', example: 'GhostInTheShell' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  display_name?: string;

  @ApiPropertyOptional({ description: 'Avatar image URL', example: 'https://cdn.cybercrew.online/avatars/u1.png' })
  @IsOptional()
  @IsString()
  avatar_url?: string;
}
