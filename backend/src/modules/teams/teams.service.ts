import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { JoinTeamDto } from './dto/join-team.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Generates a URL-safe slug from a team name.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Retrieves all registered squads for public directory & scoreboard.
   */
  async listTeams(search?: string) {
    const client = this.supabaseService.getClient();

    let query = client
      .from('teams')
      .select('id, name, slug, score, created_at, members:team_members(id, user_id)')
      .order('score', { ascending: false });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: teams, error } = await query;
    if (error) {
      throw new InternalServerErrorException('Failed to query squad registry.');
    }

    // Assign ranking based on score order
    return (teams || []).map((t, idx) => ({
      ...t,
      rank: idx + 1,
      members_count: t.members?.length || 0,
    }));
  }

  /**
   * Establishes a new squad with the creating operative as Captain.
   */
  async createTeam(user: AuthUser, dto: CreateTeamDto) {
    const client = this.supabaseService.getClient();

    // Check if user is already enrolled in a squad
    const { data: existingMembership } = await client
      .from('team_members')
      .select('id, team:teams(name)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMembership) {
      throw new ConflictException(
        'Operative is already enlisted in an active squad. Leave current squad first.',
      );
    }

    // Verify competition registration state
    const { data: settings } = await client
      .from('competition_settings')
      .select('registration_open, state')
      .eq('id', 1)
      .single();

    if (settings && !settings.registration_open && settings.state !== 'LIVE') {
      throw new ForbiddenException('Squad registration is presently closed by organizers.');
    }

    const slug = this.generateSlug(dto.name);
    if (!slug) {
      throw new BadRequestException('Invalid squad name.');
    }

    // Check name / slug uniqueness
    const { data: conflict } = await client
      .from('teams')
      .select('id')
      .or(`name.ilike.${dto.name},slug.eq.${slug}`)
      .maybeSingle();

    if (conflict) {
      throw new ConflictException('Squad name is already claimed by another team.');
    }

    const inviteCode = this.supabaseService.generateInviteCode();

    // Create team record
    const { data: newTeam, error: teamError } = await client
      .from('teams')
      .insert({
        name: dto.name.trim(),
        slug,
        invite_code: inviteCode,
        captain_id: user.id,
        score: 0,
      })
      .select()
      .single();

    if (teamError || !newTeam) {
      this.logger.error(`Failed to create team: ${teamError?.message}`);
      throw new InternalServerErrorException('Failed to establish squad.');
    }

    // Enlist captain in team_members table
    const { error: memberError } = await client.from('team_members').insert({
      team_id: newTeam.id,
      user_id: user.id,
      role: 'CAPTAIN',
    });

    if (memberError) {
      // Rollback team
      await client.from('teams').delete().eq('id', newTeam.id);
      throw new InternalServerErrorException('Failed to record squad captaincy.');
    }

    // Elevate user role to TEAM_CAPTAIN if currently PARTICIPANT
    if (user.role === 'PARTICIPANT') {
      await client
        .from('users')
        .update({ role: 'TEAM_CAPTAIN' })
        .eq('id', user.id);
    }

    // Invalidate cached user session so operative's new squad affiliation is recognized immediately
    JwtAuthGuard.clearCache();

    this.logger.log(`Squad established: [${newTeam.name}] by operative ${user.username}`);
    return newTeam;
  }

  /**
   * Enlists an operative into an existing squad via invite code.
   */
  async joinTeam(user: AuthUser, dto: JoinTeamDto) {
    const client = this.supabaseService.getClient();

    // Check if user is already enrolled
    const { data: existingMembership } = await client
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMembership) {
      throw new ConflictException('Operative is already enlisted in an active squad.');
    }

    // Find squad by invite code
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id, name, slug, captain_id, score')
      .eq('invite_code', dto.invite_code.trim().toUpperCase())
      .maybeSingle();

    if (teamError || !team) {
      throw new NotFoundException('Invalid or expired squad invitation code.');
    }

    // Check squad size limit against competition settings
    const { data: settings } = await client
      .from('competition_settings')
      .select('max_team_size, registration_open')
      .eq('id', 1)
      .single();

    const maxTeamSize = settings?.max_team_size || 4;

    const { count, error: countError } = await client
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', team.id);

    if (count !== null && count >= maxTeamSize) {
      throw new BadRequestException(
        `Squad roster is full (Maximum permitted: ${maxTeamSize} operatives).`,
      );
    }

    // Enlist member
    const { error: joinError } = await client.from('team_members').insert({
      team_id: team.id,
      user_id: user.id,
      role: 'MEMBER',
    });

    if (joinError) {
      throw new InternalServerErrorException('Failed to join squad.');
    }

    // Invalidate cached user session so operative's joined squad affiliation is recognized immediately
    JwtAuthGuard.clearCache();

    this.logger.log(`Operative ${user.username} enlisted in squad: [${team.name}]`);
    return team;
  }

  /**
   * Retrieves complete squad dossier by slug.
   * Public endpoint helper - strictly omits sensitive fields like invite_code.
   */
  async getTeamBySlug(slugOrId: string, currentUser?: AuthUser) {
    const client = this.supabaseService.getClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    const { data: team, error } = await client
      .from('teams')
      .select(`
        id,
        name,
        slug,
        captain_id,
        score,
        created_at,
        members:team_members(
          id,
          role,
          joined_at,
          user:users(id, username, display_name, avatar_url, role)
        )
      `)
      .eq(isUuid ? 'id' : 'slug', slugOrId)
      .maybeSingle();

    if (error || !team) {
      throw new NotFoundException('Squad dossier not found.');
    }

    return team;
  }

  /**
   * Retrieves squad invitation code. Restrict strictly to Squad Captain or Administrator.
   * Prevents cross-team IDOR and unauthorized member/visitor access.
   */
  async getInviteCode(slugOrId: string, currentUser: AuthUser) {
    const client = this.supabaseService.getClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    const { data: team, error } = await client
      .from('teams')
      .select('id, captain_id, invite_code')
      .eq(isUuid ? 'id' : 'slug', slugOrId)
      .maybeSingle();

    if (error || !team) {
      throw new NotFoundException('Squad dossier not found.');
    }

    const isCaptain = team.captain_id === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

    if (!isCaptain && !isAdmin) {
      throw new ForbiddenException(
        'Access denied. Only the Squad Captain or Administrator may view the invitation code.',
      );
    }

    return { invite_code: team.invite_code };
  }

  /**
   * Regenerates squad invitation code. Restrict to Captain or Admin.
   */
  async regenerateInviteCode(teamId: string, user: AuthUser) {
    const client = this.supabaseService.getClient();

    const { data: team } = await client
      .from('teams')
      .select('captain_id')
      .eq('id', teamId)
      .maybeSingle();

    if (!team) {
      throw new NotFoundException('Squad not found.');
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const isCaptain = team.captain_id === user.id;

    if (!isCaptain && !isAdmin) {
      throw new ForbiddenException('Only the Squad Captain may regenerate the invite code.');
    }

    const newCode = this.supabaseService.generateInviteCode();

    const { data: updated, error } = await client
      .from('teams')
      .update({ invite_code: newCode, updated_at: new Date().toISOString() })
      .eq('id', teamId)
      .select('invite_code')
      .single();

    if (error || !updated) {
      throw new InternalServerErrorException('Failed to rotate invitation code.');
    }

    return updated;
  }

  /**
   * Transfers squad command (Captaincy) to another team member.
   */
  async transferCaptain(teamId: string, targetUserId: string, user: AuthUser) {
    const client = this.supabaseService.getClient();

    const { data: team } = await client
      .from('teams')
      .select('captain_id, name')
      .eq('id', teamId)
      .maybeSingle();

    if (!team) {
      throw new NotFoundException('Squad not found.');
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    if (team.captain_id !== user.id && !isAdmin) {
      throw new ForbiddenException('Only the current Captain may transfer squad command.');
    }

    // Verify target user is a member of this squad
    const { data: targetMembership } = await client
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!targetMembership) {
      throw new BadRequestException('Target operative is not enlisted in this squad.');
    }

    // Demote old captain
    await client
      .from('team_members')
      .update({ role: 'MEMBER' })
      .eq('team_id', teamId)
      .eq('user_id', team.captain_id);

    // Promote new captain
    await client
      .from('team_members')
      .update({ role: 'CAPTAIN' })
      .eq('team_id', teamId)
      .eq('user_id', targetUserId);

    // Update team captain_id
    await client
      .from('teams')
      .update({ captain_id: targetUserId, updated_at: new Date().toISOString() })
      .eq('id', teamId);

    // Update user roles
    await client.from('users').update({ role: 'TEAM_CAPTAIN' }).eq('id', targetUserId);
    await client.from('users').update({ role: 'PARTICIPANT' }).eq('id', team.captain_id);

    return { success: true, message: 'Squad command transferred.' };
  }

  /**
   * Discharges an operative from their current squad.
   */
  async leaveTeam(teamId: string, user: AuthUser) {
    const client = this.supabaseService.getClient();

    const { data: team } = await client
      .from('teams')
      .select('id, captain_id, name')
      .eq('id', teamId)
      .maybeSingle();

    if (!team) {
      throw new NotFoundException('Squad not found.');
    }

    const { data: memberCount } = await client
      .from('team_members')
      .select('id', { count: 'exact' })
      .eq('team_id', teamId);

    const count = memberCount?.length || 1;

    // If operative is captain
    if (team.captain_id === user.id) {
      if (count > 1) {
        throw new BadRequestException(
          'Squad Captain cannot abandon team while other operatives are enlisted. Transfer captaincy first.',
        );
      } else {
        // Sole member: dissolve squad
        await client.from('teams').delete().eq('id', teamId);
        await client.from('users').update({ role: 'PARTICIPANT' }).eq('id', user.id);
        return { success: true, message: 'Squad dissolved.' };
      }
    }

    // Standard member leave
    await client
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.id);

    return { success: true, message: 'Discharged from squad.' };
  }

  /**
   * Retrieves immutable score transaction history for a team.
   */
  async getTeamScoreHistory(slug: string) {
    const client = this.supabaseService.getClient();

    const { data: team } = await client
      .from('teams')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!team) {
      throw new NotFoundException('Squad not found.');
    }

    const { data: history, error } = await client
      .from('score_events')
      .select('*')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to retrieve score ledger.');
    }

    return history || [];
  }

  /**
   * Retrieves verified solves for a team.
   */
  async getTeamSolves(slug: string) {
    const client = this.supabaseService.getClient();

    const { data: team } = await client
      .from('teams')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!team) {
      throw new NotFoundException('Squad not found.');
    }

    const { data: solves, error } = await client
      .from('solves')
      .select(`
        id,
        points_awarded,
        is_first_blood,
        solved_at,
        challenge:challenges(id, name, slug, difficulty, challenge_type)
      `)
      .eq('team_id', team.id)
      .order('solved_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to retrieve squad solves.');
    }

    return solves || [];
  }

  /**
   * Administrative adjustment of squad points (Audited).
   */
  async adminAdjustScore(teamId: string, points: number, reason: string, adminUser: AuthUser) {
    const client = this.supabaseService.getClient();

    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id, name, score')
      .eq('id', teamId)
      .maybeSingle();

    if (teamError || !team) {
      throw new NotFoundException('Squad not found.');
    }

    const newScore = Math.max(0, team.score + points);

    // Update team score
    await client
      .from('teams')
      .update({ score: newScore, updated_at: new Date().toISOString() })
      .eq('id', teamId);

    // Insert into immutable score ledger
    await client.from('score_events').insert({
      team_id: teamId,
      event_type: 'ADMIN_ADJUSTMENT',
      points,
      description: `Administrative Score Adjustment: ${reason}`,
      created_by: adminUser.id,
    });

    // Create audit log
    await client.from('audit_logs').insert({
      actor_id: adminUser.id,
      action: 'ADMIN_SCORE_ADJUSTMENT',
      resource_type: 'TEAM',
      resource_id: teamId,
      metadata: {
        team_name: team.name,
        delta: points,
        prior_score: team.score,
        new_score: newScore,
        reason,
      },
    });

    return {
      team_id: teamId,
      score: newScore,
      delta: points,
      reason,
    };
  }

  /**
   * Retrieves current authenticated squad's progress and solve metrics.
   * Derives team affiliation directly from authenticated user session (Prevents IDOR).
   */
  async getMyTeamProgress(user?: AuthUser) {
    if (!user?.team_id) {
      return {
        team: null,
        solved_count: 0,
        total_challenges: 0,
        earned_points: 0,
        total_possible_points: 0,
        solved_challenge_ids: [],
      };
    }

    const client = this.supabaseService.getClient();

    // Fetch team
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id, name, slug, score')
      .eq('id', user.team_id)
      .maybeSingle();

    if (teamError || !team) {
      return {
        team: null,
        solved_count: 0,
        total_challenges: 0,
        earned_points: 0,
        total_possible_points: 0,
        solved_challenge_ids: [],
      };
    }

    // Fetch all active & published challenges
    const { data: challenges, error: chalError } = await client
      .from('challenges')
      .select('id, base_points, current_points')
      .eq('is_published', true)
      .eq('is_active', true);

    if (chalError) {
      throw new InternalServerErrorException('Failed to calculate challenge inventory.');
    }

    const activeChallenges = challenges || [];
    const totalChallenges = activeChallenges.length;
    const totalPossiblePoints = activeChallenges.reduce(
      (acc, c) => acc + (c.base_points || 500),
      0,
    );

    // Fetch team solves
    const { data: solves, error: solveError } = await client
      .from('solves')
      .select('challenge_id')
      .eq('team_id', user.team_id);

    if (solveError) {
      throw new InternalServerErrorException('Failed to retrieve squad solves.');
    }

    const solvedChallengeIds = (solves || []).map((s) => s.challenge_id);
    const solvedCount = solvedChallengeIds.length;

    return {
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
      },
      solved_count: solvedCount,
      total_challenges: totalChallenges,
      earned_points: team.score,
      total_possible_points: totalPossiblePoints,
      solved_challenge_ids: solvedChallengeIds,
    };
  }
}
