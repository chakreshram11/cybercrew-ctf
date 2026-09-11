import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private cachedStats: any = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL_MS = 5000; // 5 seconds in-memory cache

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Aggregates real-time platform metrics for administrative command center (Section 53).
   * Optimized with single atomic PostgreSQL RPC function and 5s in-memory cache.
   */
  async getDashboardStats() {
    const now = Date.now();
    if (this.cachedStats && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cachedStats;
    }

    const client = this.supabaseService.getClient();

    try {
      // 1. Optimized path: Single atomic RPC function call
      const { data: rpcData, error: rpcError } = await client.rpc('get_admin_dashboard_stats');
      if (!rpcError && rpcData) {
        this.cachedStats = rpcData;
        this.cacheTimestamp = now;
        return rpcData;
      }
    } catch (err: any) {
      this.logger.warn(`RPC stats failed, falling back to parallel count queries: ${err.message}`);
    }

    // 2. Fallback path: Parallel count queries
    const [
      { count: participantsCount },
      { count: teamsCount },
      { count: challengesCount },
      { count: activeChallengesCount },
      { count: submissionsCount },
      { count: solvesCount },
      { count: hintsUnlockedCount },
      { data: hintPointsData },
    ] = await Promise.all([
      client.from('users').select('*', { count: 'exact', head: true }).eq('role', 'PARTICIPANT'),
      client.from('teams').select('*', { count: 'exact', head: true }),
      client.from('challenges').select('*', { count: 'exact', head: true }),
      client.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      client.from('submissions').select('*', { count: 'exact', head: true }),
      client.from('solves').select('*', { count: 'exact', head: true }),
      client.from('hint_unlocks').select('*', { count: 'exact', head: true }),
      client.from('hint_unlocks').select('cost'),
    ]);

    const pointsDeducted = (hintPointsData || []).reduce((acc, h) => acc + (h.cost || 0), 0);

    const stats = {
      participants_count: participantsCount ?? 0,
      teams_count: teamsCount ?? 0,
      challenges_count: challengesCount ?? 0,
      active_challenges_count: activeChallengesCount ?? 0,
      submissions_count: submissionsCount ?? 0,
      solves_count: solvesCount ?? 0,
      hints_unlocked_count: hintsUnlockedCount ?? 0,
      points_deducted_hints: pointsDeducted,
    };

    this.cachedStats = stats;
    this.cacheTimestamp = now;
    return stats;
  }

  /**
   * Deep analytics for a specific challenge scenario (Section 43).
   */
  async getChallengeAnalytics(challengeId: string) {
    const client = this.supabaseService.getClient();

    const { data: challenge, error: chalError } = await client
      .from('challenges')
      .select('id, name, slug, base_points, current_points, minimum_points, solves_count, difficulty, challenge_type')
      .eq('id', challengeId)
      .maybeSingle();

    if (chalError || !challenge) {
      throw new NotFoundException('Challenge not found.');
    }

    // Submissions breakdown
    const { data: submissions } = await client
      .from('submissions')
      .select('id, is_correct, team_id, user_id, submitted_at, team:teams(name)')
      .eq('challenge_id', challengeId)
      .order('submitted_at', { ascending: true });

    const totalSubmissions = submissions?.length || 0;
    const correctSubmissions = submissions?.filter((s) => s.is_correct).length || 0;
    const incorrectSubmissions = totalSubmissions - correctSubmissions;

    const uniqueTeams = new Set(submissions?.map((s) => s.team_id)).size;
    const uniqueUsers = new Set(submissions?.map((s) => s.user_id)).size;

    // Total registered teams for solve percentage
    const { count: totalTeamsCount } = await client
      .from('teams')
      .select('id', { count: 'exact', head: true });

    const solvePercentage =
      totalTeamsCount && totalTeamsCount > 0
        ? Number(((challenge.solves_count / totalTeamsCount) * 100).toFixed(1))
        : 0;

    // First Blood Squad
    const { data: firstBlood } = await client
      .from('solves')
      .select('solved_at, points_awarded, team:teams(id, name)')
      .eq('challenge_id', challengeId)
      .eq('is_first_blood', true)
      .maybeSingle();

    // Hints analytics for this challenge
    const { data: hintUnlocks } = await client
      .from('hint_unlocks')
      .select('id, cost')
      .eq('challenge_id', challengeId);

    const hintsPurchasedCount = hintUnlocks?.length || 0;
    const hintPointsDeducted = (hintUnlocks || []).reduce((acc, h) => acc + (h.cost || 0), 0);

    return {
      challenge,
      total_submissions: totalSubmissions,
      correct_submissions: correctSubmissions,
      incorrect_submissions: incorrectSubmissions,
      unique_teams_attempted: uniqueTeams,
      unique_users_attempted: uniqueUsers,
      solve_percentage: solvePercentage,
      first_blood: firstBlood
        ? {
            team: firstBlood.team,
            solved_at: firstBlood.solved_at,
            points_awarded: firstBlood.points_awarded,
          }
        : null,
      hints_purchased: hintsPurchasedCount,
      hint_points_deducted: hintPointsDeducted,
      current_value: challenge.current_points || challenge.base_points,
      recent_timeline: (submissions || []).slice(-50).reverse().map((s: any) => ({
        id: s.id,
        team_name: s.team?.name || 'Unknown',
        is_correct: s.is_correct,
        submitted_at: s.submitted_at,
      })),
    };
  }

  /**
   * Retrieves administrative audit log trail (Section 63).
   */
  async getAuditLogs(limit = 100) {
    const client = this.supabaseService.getClient();

    const { data: logs, error } = await client
      .from('audit_logs')
      .select(`
        id,
        action,
        resource_type,
        resource_id,
        metadata,
        created_at,
        actor:users(id, username, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new InternalServerErrorException('Failed to retrieve audit log telemetry.');
    }

    return logs || [];
  }

  /**
   * Retrieves singleton event competition settings (Section 60).
   */
  async getCompetitionSettings() {
    const client = this.supabaseService.getClient();

    const { data: settings, error } = await client
      .from('competition_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !settings) {
      throw new NotFoundException('Competition settings not initialized.');
    }

    return settings;
  }

  /**
   * Modifies competition settings (Audited).
   */
  async updateCompetitionSettings(dto: UpdateSettingsDto, actor: AuthUser) {
    const client = this.supabaseService.getClient();

    const { data: updated, error } = await client
      .from('competition_settings')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select()
      .single();

    if (error || !updated) {
      throw new InternalServerErrorException('Failed to apply competition policy updates.');
    }

    // Audit log
    await client.from('audit_logs').insert({
      actor_id: actor.id,
      action: 'EVENT_SETTINGS_UPDATE',
      resource_type: 'SETTINGS',
      resource_id: '1',
      metadata: { updated_fields: Object.keys(dto), state: updated.state },
    });

    this.logger.log(`Competition policies updated by [${actor.username}] - State: ${updated.state}`);
    return updated;
  }

  /**
   * Performs an atomic reset of competition progress and scoring ledger.
   * Clears score events, solves, submissions, hint unlocks, resets team scores to 0,
   * resets challenge solve counts to 0, and restores dynamic points to base_points.
   */
  async resetCompetition(actor: AuthUser) {
    const client = this.supabaseService.getClient();

    try {
      // 1. Delete all score events
      const { error: scoreEventsErr } = await client.from('score_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (scoreEventsErr) throw scoreEventsErr;

      // 2. Delete all solves
      const { error: solvesErr } = await client.from('solves').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (solvesErr) throw solvesErr;

      // 3. Delete all submissions
      const { error: submissionsErr } = await client.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (submissionsErr) throw submissionsErr;

      // 4. Delete all hint unlocks
      const { error: hintUnlocksErr } = await client.from('hint_unlocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (hintUnlocksErr) throw hintUnlocksErr;

      // 5. Reset all team scores to zero
      const { error: teamsErr } = await client
        .from('teams')
        .update({ score: 0, updated_at: new Date().toISOString() })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (teamsErr) throw teamsErr;

      // 6. Reset challenge solve counts and restore current_points to base_points
      const { data: challenges } = await client.from('challenges').select('id, base_points');
      if (challenges && challenges.length > 0) {
        for (const ch of challenges) {
          await client
            .from('challenges')
            .update({
              solves_count: 0,
              current_points: ch.base_points,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ch.id);
        }
      }

      // Reset in-memory cached stats
      this.cachedStats = null;

      // 7. Write audit log
      await client.from('audit_logs').insert({
        actor_id: actor.id,
        action: 'COMPETITION_SCORE_RESET',
        resource_type: 'COMPETITION',
        resource_id: '1',
        metadata: {
          description: 'Competition scoring and challenge progress reset by administrator.',
        },
      });

      this.logger.log(`Competition scoring and progress reset by admin [${actor.username}]`);

      return {
        success: true,
        message: 'Competition scoring and progress reset successfully.',
      };
    } catch (err: any) {
      this.logger.error(`Competition reset failed: ${err.message}`);
      throw new InternalServerErrorException(`Failed to reset competition state: ${err.message}`);
    }
  }
}
