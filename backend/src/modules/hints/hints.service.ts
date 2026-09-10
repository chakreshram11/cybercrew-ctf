import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CompetitionAccessService } from '../../common/services/competition-access.service';
import { CreateHintDto } from './dto/create-hint.dto';
import { UpdateHintDto } from './dto/update-hint.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class HintsService {
  private readonly logger = new Logger(HintsService.name);

  constructor(
    private supabaseService: SupabaseService,
    private competitionAccessService: CompetitionAccessService,
  ) {}

  /**
   * Retrieves participant-facing hints for a challenge scenario.
   * Content is strictly masked unless unlocked by operative team.
   */
  async listPublicHints(challengeId: string, currentUser?: AuthUser) {
    await this.competitionAccessService.validateParticipantAccess(currentUser);

    const client = this.supabaseService.getClient();

    const { data: hints, error } = await client
      .from('challenge_hints')
      .select('id, challenge_id, title, cost, display_order, is_active')
      .eq('challenge_id', challengeId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Failed to retrieve challenge hints.');
    }

    if (!hints || hints.length === 0) {
      return [];
    }

    let unlockedHintIds = new Set<string>();

    if (currentUser?.team_id) {
      const { data: unlocks } = await client
        .from('hint_unlocks')
        .select('hint_id')
        .eq('team_id', currentUser.team_id)
        .eq('challenge_id', challengeId);

      if (unlocks) {
        unlockedHintIds = new Set(unlocks.map((u) => u.hint_id));
      }
    }

    return Promise.all(
      hints.map(async (h) => {
        const isUnlocked = unlockedHintIds.has(h.id);
        let content = undefined;

        if (isUnlocked) {
          const { data: hintDetail } = await client
            .from('challenge_hints')
            .select('content')
            .eq('id', h.id)
            .single();
          content = hintDetail?.content;
        }

        return {
          id: h.id,
          challenge_id: h.challenge_id,
          title: h.title,
          cost: h.cost,
          display_order: h.display_order,
          is_active: h.is_active,
          is_unlocked: isUnlocked,
          content,
        };
      }),
    );
  }

  /**
   * Unlocks intelligence hint atomically with score deduction (Sections 28, 30, 31, 32).
   * Verifies squad score, prevents double-charging, checks allow_negative_scores,
   * and records HINT_PURCHASE in the immutable score ledger.
   */
  async unlockHint(challengeId: string, hintId: string, user: AuthUser) {
    await this.competitionAccessService.validateParticipantAccess(user);

    const client = this.supabaseService.getClient();

    // 1. Verify operative is enrolled in an active squad
    if (!user.team_id) {
      throw new BadRequestException('Operative must be enlisted in a squad to unlock hints.');
    }

    // 2. Verify competition state
    const { data: settings } = await client
      .from('competition_settings')
      .select('state, allow_negative_scores, hints_enabled')
      .eq('id', 1)
      .single();

    const isAdmin =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'CHALLENGE_AUTHOR';

    if (settings && (!settings.hints_enabled || settings.state !== 'LIVE') && !isAdmin) {
      throw new ForbiddenException('Hint unlocking is presently disabled by competition rules.');
    }

    // 3. Verify challenge availability
    const { data: challenge } = await client
      .from('challenges')
      .select('id, name, is_published, is_active')
      .eq('id', challengeId)
      .maybeSingle();

    if (!challenge || (!challenge.is_published || !challenge.is_active) && !isAdmin) {
      throw new NotFoundException('Challenge scenario is not currently available.');
    }

    // 4. Verify hint exists and belongs to challenge
    const { data: hint, error: hintError } = await client
      .from('challenge_hints')
      .select('id, title, content, cost, is_active')
      .eq('id', hintId)
      .eq('challenge_id', challengeId)
      .maybeSingle();

    if (hintError || !hint || !hint.is_active) {
      throw new NotFoundException('Requested intelligence hint not found or deactivated.');
    }

    // 5. Check whether team already unlocked this hint (Never charge twice - Section 29, 33)
    const { data: existingUnlock } = await client
      .from('hint_unlocks')
      .select('id')
      .eq('team_id', user.team_id)
      .eq('hint_id', hintId)
      .maybeSingle();

    if (existingUnlock) {
      // Already unlocked by team member: return content directly with zero additional charge
      return {
        hint_id: hint.id,
        title: hint.title,
        content: hint.content,
        cost: 0,
        already_unlocked: true,
      };
    }

    // 6. Fetch live team score and check negative score restriction (Section 32)
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id, name, score')
      .eq('id', user.team_id)
      .single();

    if (teamError || !team) {
      throw new InternalServerErrorException('Failed to retrieve squad score balance.');
    }

    const hintCost = hint.cost || 0;
    const allowNegative = settings?.allow_negative_scores ?? false;

    if (!allowNegative && team.score < hintCost) {
      throw new BadRequestException(
        `Insufficient points to unlock this hint. (Squad score: ${team.score} PTS, Cost: ${hintCost} PTS). Negative scores are disallowed.`,
      );
    }

    // 7. Atomic Concurrency Gate: Insert into hint_unlocks FIRST.
    // The database constraint `UNIQUE(team_id, hint_id)` guarantees that exactly ONE request
    // succeeds across simultaneous concurrent attempts.
    const { error: unlockError } = await client.from('hint_unlocks').insert({
      hint_id: hint.id,
      challenge_id: challengeId,
      team_id: user.team_id,
      user_id: user.id,
      cost: hintCost,
      unlocked_at: new Date().toISOString(),
    });

    if (unlockError) {
      if (unlockError.code === '23505' || unlockError.message?.includes('uq_team_hint')) {
        // Concurrency defense: Another teammate unlocked the hint at the identical millisecond.
        // Return unlocked content with 0 additional charge and NO score deduction.
        return {
          hint_id: hint.id,
          title: hint.title,
          content: hint.content,
          cost: 0,
          already_unlocked: true,
        };
      }
      throw new InternalServerErrorException('Failed to record hint unlock.');
    }

    // 8. Exactly one winner: Deduct points and record HINT_PURCHASE in immutable score ledger
    if (hintCost > 0) {
      const newTeamScore = team.score - hintCost;

      // Deduct team score
      const { error: updateScoreError } = await client
        .from('teams')
        .update({
          score: newTeamScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.team_id);

      if (updateScoreError) {
        this.logger.error(`Failed to update squad balance: ${updateScoreError.message}`);
      }

      // Record HINT_PURCHASE in score ledger
      await client.from('score_events').insert({
        team_id: user.team_id,
        event_type: 'HINT_PURCHASE',
        points: -hintCost,
        challenge_id: challengeId,
        hint_id: hint.id,
        description: `Unlocked hint: "${hint.title}" for ${challenge.name}`,
        created_by: user.id,
      });
    }

    this.logger.log(
      `Hint unlocked: Team ${user.team_id} unlocked [${hint.title}] on [${challenge.name}] (-${hintCost} pts)`,
    );

    return {
      hint_id: hint.id,
      title: hint.title,
      content: hint.content,
      cost: hintCost,
      already_unlocked: false,
    };
  }

  /**
   * Administrative view of all hints across challenges.
   */
  async adminListHints() {
    const client = this.supabaseService.getClient();

    const { data: hints, error } = await client
      .from('challenge_hints')
      .select(`
        id,
        challenge_id,
        title,
        content,
        cost,
        display_order,
        is_active,
        created_at,
        challenge:challenges(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException('Failed to query administrative hints.');
    }

    return (hints || []).map((h: any) => ({
      ...h,
      challenge_name: h.challenge?.name || 'Unknown',
    }));
  }

  /**
   * Creates a new hint for a challenge scenario.
   */
  async createHint(challengeId: string, dto: CreateHintDto) {
    const client = this.supabaseService.getClient();

    const { data: newHint, error } = await client
      .from('challenge_hints')
      .insert({
        challenge_id: challengeId,
        title: dto.title.trim(),
        content: dto.content.trim(),
        cost: dto.cost ?? 0,
        display_order: dto.display_order ?? 0,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error || !newHint) {
      throw new InternalServerErrorException('Failed to provision hint.');
    }

    return newHint;
  }

  /**
   * Updates an existing hint.
   */
  async updateHint(id: string, dto: UpdateHintDto) {
    const client = this.supabaseService.getClient();

    const { data: updated, error } = await client
      .from('challenge_hints')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new NotFoundException('Hint not located or update failed.');
    }

    return updated;
  }

  /**
   * Permanently deletes a hint.
   */
  async deleteHint(id: string) {
    const client = this.supabaseService.getClient();

    const { error } = await client.from('challenge_hints').delete().eq('id', id);
    if (error) {
      throw new InternalServerErrorException('Failed to delete hint.');
    }

    return { success: true, message: 'Hint deleted.' };
  }
}
