import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateChallengeVisibilityDto {
  @ApiProperty({ description: 'Visibility flag for participants', example: true })
  @IsNotEmpty()
  @IsBoolean()
  is_visible: boolean;
}
