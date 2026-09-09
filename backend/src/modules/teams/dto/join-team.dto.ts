import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinTeamDto {
  @ApiProperty({ description: 'Squad cryptographic invitation code', example: 'C7B89F2A' })
  @IsNotEmpty()
  @IsString()
  @Length(4, 16)
  invite_code: string;
}
