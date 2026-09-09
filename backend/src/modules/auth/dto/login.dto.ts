import { IsString, IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Operative email address', example: 'agent@cybercrew.online' })
  @IsNotEmpty({ message: 'Email address is required.' })
  @IsEmail({}, { message: 'Invalid email address format.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @ApiProperty({ description: 'Operative account password', example: 'SecretP@ss123' })
  @IsNotEmpty({ message: 'Password is required.' })
  @IsString({ message: 'Password must be a string.' })
  password: string;
}
