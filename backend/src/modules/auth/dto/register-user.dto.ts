import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({ description: 'Operative callsign / username', example: 'v01d_h4ck3r' })
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username may only contain letters, numbers, underscores, and dashes.',
  })
  username: string;

  @ApiProperty({ description: 'Operative email address', example: 'agent@cybercrew.online' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Operative account password (min. 8 characters)', example: 'SecretP@ss123' })
  @IsString()
  @MinLength(8)
  password: string;
}
