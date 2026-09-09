import { IsString, IsEmail, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthSyncDto {
  @ApiProperty({ description: 'Operative callsign / username', example: 'v01d_h4ck3r' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username may only contain letters, numbers, underscores, and dashes.',
  })
  username: string;

  @ApiProperty({ description: 'Operative email address', example: 'agent@cybercrew.online' })
  @IsEmail()
  email: string;
}
