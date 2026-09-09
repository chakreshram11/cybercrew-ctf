import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/decorators/roles.decorator';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'Updated operative security role',
    enum: [
      'PARTICIPANT',
      'TEAM_CAPTAIN',
      'CHALLENGE_AUTHOR',
      'MODERATOR',
      'ADMIN',
      'SUPER_ADMIN',
    ],
    example: 'CHALLENGE_AUTHOR',
  })
  @IsNotEmpty()
  @IsIn([
    'PARTICIPANT',
    'TEAM_CAPTAIN',
    'CHALLENGE_AUTHOR',
    'MODERATOR',
    'ADMIN',
    'SUPER_ADMIN',
  ])
  role: UserRole;
}
