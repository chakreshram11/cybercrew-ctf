import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitFlagDto {
  @ApiProperty({
    description: 'Captured challenge flag string',
    example: 'CCCTF{y0ur_captur3d_fl4g_h3r3}',
  })
  @IsNotEmpty({ message: 'Flag submission cannot be empty.' })
  @IsString()
  @MaxLength(255)
  flag: string;
}
