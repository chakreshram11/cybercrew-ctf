import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserRole } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Retrieves current operative profile including team affiliation and solves count.
   */
  async getMe(userId: string) {
    const profile = await this.supabaseService.getUserProfile(userId);
    if (!profile) {
      throw new NotFoundException('Operative profile not located.');
    }
    return profile;
  }

  /**
   * Updates operative profile display attributes.
   */
  async updateMe(userId: string, dto: UpdateUserDto) {
    const client = this.supabaseService.getClient();

    const { data: updated, error } = await client
      .from('users')
      .update({
        display_name: dto.display_name,
        avatar_url: dto.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException('Failed to update operative profile.');
    }

    return updated;
  }

  /**
   * Public operative profile lookup (sanitized, no internal credentials).
   */
  async getPublicProfile(userId: string) {
    const client = this.supabaseService.getClient();

    const { data: user, error } = await client
      .from('users')
      .select('id, username, display_name, avatar_url, role, created_at')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !user) {
      throw new NotFoundException('Operative profile not found or inactive.');
    }

    // Get team membership if any
    const { data: membership } = await client
      .from('team_members')
      .select('team:teams(id, name, slug, score)')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      ...user,
      team: membership?.team || null,
    };
  }

  /**
   * Administrative directory of all registered operatives.
   */
  async adminListUsers(search?: string) {
    const client = this.supabaseService.getClient();
    let query = client
      .from('users')
      .select('id, username, display_name, email, role, is_active, created_at, last_login_at')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error } = await query;
    if (error) {
      throw new InternalServerErrorException('Failed to fetch operative directory.');
    }

    return users || [];
  }

  /**
   * Administrative activation / suspension toggle.
   */
  async adminToggleActive(targetUserId: string, isActive: boolean, actor: AuthUser) {
    if (targetUserId === actor.id && !isActive) {
      throw new ForbiddenException('Administrators cannot suspend their own session.');
    }

    const client = this.supabaseService.getClient();
    const { data: updated, error } = await client
      .from('users')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)
      .select()
      .single();

    if (error || !updated) {
      throw new InternalServerErrorException('Failed to modify operative status.');
    }

    // Log administrative audit event
    await client.from('audit_logs').insert({
      actor_id: actor.id,
      action: isActive ? 'USER_REACTIVATE' : 'USER_SUSPEND',
      resource_type: 'USER',
      resource_id: targetUserId,
      metadata: { target_username: updated.username },
    });

    return updated;
  }

  /**
   * Administrative role assignment with strict privilege boundary enforcement.
   */
  async adminUpdateRole(targetUserId: string, dto: UpdateRoleDto, actor: AuthUser) {
    // Section 54: Do not allow lower-level admins to grant themselves or others SUPER_ADMIN
    if (dto.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Only an existing SUPER_ADMIN may assign the SUPER_ADMIN role.',
      );
    }

    const client = this.supabaseService.getClient();
    const { data: updated, error } = await client
      .from('users')
      .update({
        role: dto.role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)
      .select()
      .single();

    if (error || !updated) {
      throw new InternalServerErrorException('Failed to update operative role.');
    }

    // Log administrative audit event
    await client.from('audit_logs').insert({
      actor_id: actor.id,
      action: 'USER_ROLE_CHANGE',
      resource_type: 'USER',
      resource_id: targetUserId,
      metadata: { new_role: dto.role, target_username: updated.username },
    });

    return updated;
  }
}
