import { SetMetadata } from '@nestjs/common';

export type UserRole =
  | 'PARTICIPANT'
  | 'TEAM_CAPTAIN'
  | 'CHALLENGE_AUTHOR'
  | 'MODERATOR'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
