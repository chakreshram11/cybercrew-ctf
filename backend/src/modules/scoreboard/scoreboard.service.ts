import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

export interface ScoreboardEntry {
  rank: number;
  team_id: string;
  team_name: string;
  team_slug: string;
  score: number;
  solves_count: number;
  first_bloods_count: number;
  last_solve_at: string | null;
}

@Injectable()
export class ScoreboardService {
  private readonly logger = new Logger(ScoreboardService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Generates live scoreboard ranking derived from the verified team balances and solve logs.
   * Enforces freeze_time when scoreboard_frozen is true for non-administrators.
   */
  async getScoreboard(currentUser?: AuthUser): Promise<ScoreboardEntry[]> {
    const client = this.supabaseService.getClient();

    // Check freeze settings
    const { data: settings } = await client
      .from('competition_settings')
      .select('scoreboard_frozen, freeze_time')
      .eq('id', 1)
      .single();

    const isAdmin =
      currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const isFrozen = settings?.scoreboard_frozen && !isAdmin;
    const freezeTime = settings?.freeze_time;

    // Fetch teams ordered by score DESC, updated_at ASC
    let teamsQuery = client
      .from('teams')
      .select('id, name, slug, score, updated_at')
      .order('score', { ascending: false })
      .order('updated_at', { ascending: true });

    const { data: teams, error: teamsError } = await teamsQuery;
    if (teamsError) {
      throw new InternalServerErrorException('Failed to retrieve squads for scoreboard.');
    }

    if (!teams || teams.length === 0) {
      return [];
    }

    // Fetch solves to calculate solve counts and last_solve_at
    let solvesQuery = client
      .from('solves')
      .select('team_id, is_first_blood, solved_at')
      .order('solved_at', { ascending: false });

    if (isFrozen && freezeTime) {
      solvesQuery = solvesQuery.lte('solved_at', freezeTime);
    }

    const { data: solves } = await solvesQuery;

    // Aggregate solves by squad
    const solveCountMap = new Map<string, number>();
    const firstBloodCountMap = new Map<string, number>();
    const lastSolveMap = new Map<string, string>();

    if (solves) {
      for (const s of solves) {
        // Count solves
        solveCountMap.set(s.team_id, (solveCountMap.get(s.team_id) || 0) + 1);

        // Count first bloods
        if (s.is_first_blood) {
          firstBloodCountMap.set(
            s.team_id,
            (firstBloodCountMap.get(s.team_id) || 0) + 1,
          );
        }

        // Track last solve timestamp
        if (!lastSolveMap.has(s.team_id)) {
          lastSolveMap.set(s.team_id, s.solved_at);
        }
      }
    }

    // Compile scoreboard ranking entries
    const entries: ScoreboardEntry[] = teams.map((team, index) => ({
      rank: index + 1,
      team_id: team.id,
      team_name: team.name,
      team_slug: team.slug,
      score: team.score,
      solves_count: solveCountMap.get(team.id) || 0,
      first_bloods_count: firstBloodCountMap.get(team.id) || 0,
      last_solve_at: lastSolveMap.get(team.id) || null,
    }));

    return entries;
  }
}
