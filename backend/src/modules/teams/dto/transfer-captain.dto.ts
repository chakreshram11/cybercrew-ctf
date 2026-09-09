import { IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferCaptainDto {
  @ApiProperty({
    description: 'User ID of the squad operative to promote to captain',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @Matches(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    { message: 'target_user_id must be a valid UUID format' },
  )
  target_user_id: string;
}
