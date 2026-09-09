import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ description: 'Unique squad name', example: 'CyberVanguard' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9 _-]+$/, {
    message: 'Team name may only contain alphanumeric characters, spaces, underscores, and dashes.',
  })
  name: string;
}
