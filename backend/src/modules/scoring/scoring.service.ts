import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { IScoringStrategy } from './scoring-strategy.interface';
import { StaticScoringStrategy } from './strategies/static-scoring.strategy';
import { SolveCountDecayStrategy } from './strategies/solve-count-decay.strategy';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);
  private staticStrategy: IScoringStrategy;
  private decayStrategy: IScoringStrategy;

  constructor(private supabaseService: SupabaseService) {
    this.staticStrategy = new StaticScoringStrategy();
    this.decayStrategy = new SolveCountDecayStrategy();
  }

  /**
   * Calculates the current points value for a challenge based on dynamic scoring settings.
   */
  computePoints(
    basePoints: number,
    minimumPoints: number,
    solvesCount: number,
    isDynamicEnabled: boolean,
  ): number {
    if (!isDynamicEnabled) {
      return this.staticStrategy.calculatePoints(basePoints, minimumPoints, solvesCount);
    }
    return this.decayStrategy.calculatePoints(basePoints, minimumPoints, solvesCount);
  }

  /**
   * Records a confirmed solve in the database, updates the immutable score ledger,
   * checks for First Blood, updates team score, and recalculates challenge value.
   */
  async processSolve(params: {
    teamId: string;
    userId: string;
    challengeId: string;
    challengeName: string;
    basePoints: number;
    currentPoints: number;
    minimumPoints: number;
    firstBloodBonus: number;
    submissionId: string;
    isDynamicEnabled: boolean;
    isFirstBloodEnabled: boolean;
  }) {
    const client = this.supabaseService.getClient();

    // 1. Determine if this solve is First Blood
    let isFirstBlood = false;
    let firstBloodPointsAwarded = 0;

    const { count: priorSolvesCount } = await client
      .from('solves')
      .select('id', { count: 'exact', head: true })
      .eq('challenge_id', params.challengeId);

    const isFirstSolveForChallenge = (priorSolvesCount ?? 0) === 0;

    if (isFirstSolveForChallenge && params.isFirstBloodEnabled) {
      isFirstBlood = true;
      firstBloodPointsAwarded = params.firstBloodBonus;
    }

    let pointsToAward = params.currentPoints;
    let totalAwarded = pointsToAward + firstBloodPointsAwarded;

    // 2. Insert solve record into solves table
    let solveRecord: any;
    let solveError: any;

    const initialInsert = await client
      .from('solves')
      .insert({
        challenge_id: params.challengeId,
        team_id: params.teamId,
        user_id: params.userId,
        points_awarded: totalAwarded,
        is_first_blood: isFirstBlood,
        solved_at: new Date().toISOString(),
      })
      .select()
      .single();

    solveRecord = initialInsert.data;
    solveError = initialInsert.error;

    // Concurrency defense: If two squads solved at the exact same millisecond,
    // PostgreSQL partial unique index `uq_challenge_first_blood` blocks the second squad.
    // Catch conflict 23505 and gracefully downgrade to a standard solve without First Blood bonus.
    if (solveError && (solveError.code === '23505' || solveError.message?.includes('uq_challenge_first_blood')) && isFirstBlood) {
      this.logger.warn(
        `First Blood race conflict on challenge ${params.challengeId}: Team ${params.teamId} lost race by milliseconds. Downgrading to standard solve.`,
      );
      isFirstBlood = false;
      firstBloodPointsAwarded = 0;
      totalAwarded = pointsToAward;

      const fallbackInsert = await client
        .from('solves')
        .insert({
          challenge_id: params.challengeId,
          team_id: params.teamId,
          user_id: params.userId,
          points_awarded: totalAwarded,
          is_first_blood: false,
          solved_at: new Date().toISOString(),
        })
        .select()
        .single();

      solveRecord = fallbackInsert.data;
      solveError = fallbackInsert.error;
    }

    if (solveError) {
      this.logger.error(`Solve insertion failed: ${solveError.message}`);
      throw solveError;
    }

    // 3. Insert Challenge Solve into immutable score ledger
    await client.from('score_events').insert({
      team_id: params.teamId,
      event_type: 'CHALLENGE_SOLVE',
      points: pointsToAward,
      challenge_id: params.challengeId,
      submission_id: params.submissionId,
      description: `Solved ${params.challengeName}`,
    });

    // 4. If First Blood, insert First Blood bonus into score ledger
    if (isFirstBlood && firstBloodPointsAwarded > 0) {
      await client.from('score_events').insert({
        team_id: params.teamId,
        event_type: 'FIRST_BLOOD',
        points: firstBloodPointsAwarded,
        challenge_id: params.challengeId,
        submission_id: params.submissionId,
        description: `🩸 First Blood Bonus for ${params.challengeName}`,
      });
    }

    // 5. Increment team score
    const { data: team } = await client
      .from('teams')
      .select('score')
      .eq('id', params.teamId)
      .single();

    const newTeamScore = (team?.score ?? 0) + totalAwarded;
    await client
      .from('teams')
      .update({
        score: newTeamScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.teamId);

    // 6. Update challenge solves count & dynamic points decay
    const newSolvesCount = (priorSolvesCount ?? 0) + 1;
    const newCurrentPoints = this.computePoints(
      params.basePoints,
      params.minimumPoints,
      newSolvesCount,
      params.isDynamicEnabled,
    );

    await client
      .from('challenges')
      .update({
        solves_count: newSolvesCount,
        current_points: newCurrentPoints,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.challengeId);

    this.logger.log(
      `Solve processed: Team ${params.teamId} solved ${params.challengeName} (+${totalAwarded} pts, FB: ${isFirstBlood})`,
    );

    return {
      is_correct: true,
      is_first_blood: isFirstBlood,
      points_awarded: totalAwarded,
      new_team_score: newTeamScore,
      new_challenge_points: newCurrentPoints,
    };
  }
}
