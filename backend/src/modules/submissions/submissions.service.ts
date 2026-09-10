import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ScoringService } from '../scoring/scoring.service';
import { CompetitionAccessService } from '../../common/services/competition-access.service';
import { SubmitFlagDto } from './dto/submit-flag.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private supabaseService: SupabaseService,
    private scoringService: ScoringService,
    private competitionAccessService: CompetitionAccessService,
  ) {}

  /**
   * Processes an incoming flag submission with zero-trust validation,
   * duplicate solve prevention, rate-limiting, and score ledger recording.
   */
  async submitFlag(
    challengeId: string,
    dto: SubmitFlagDto,
    user: AuthUser,
    ip: string,
    userAgent: string,
  ) {
    await this.competitionAccessService.validateParticipantAccess(user);

    const client = this.supabaseService.getClient();

    // 1. Verify operative is enrolled in an active squad
    if (!user.team_id) {
      throw new BadRequestException(
        'Operative must establish or enlist in a squad before submitting flags.',
      );
    }

    // 2. Verify competition state
    const { data: settings } = await client
      .from('competition_settings')
      .select('state, dynamic_scoring_enabled, first_blood_enabled')
      .eq('id', 1)
      .single();

    const isAdmin =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'CHALLENGE_AUTHOR';

    if (settings && settings.state !== 'LIVE' && !isAdmin) {
      throw new ForbiddenException(
        `Competition is not active (Status: ${settings.state}). Flag submission is disabled.`,
      );
    }

    // 3. Verify challenge scenario exists and is published
    const { data: challenge, error: chalError } = await client
      .from('challenges')
      .select(`
        id,
        name,
        base_points,
        current_points,
        minimum_points,
        first_blood_bonus,
        is_published,
        is_active,
        max_attempts,
        submission_cooldown_seconds
      `)
      .eq('id', challengeId)
      .maybeSingle();

    if (chalError || !challenge) {
      throw new NotFoundException('Challenge scenario not found.');
    }

    if ((!challenge.is_published || !challenge.is_active) && !isAdmin) {
      throw new ForbiddenException('This challenge is not currently accepting submissions.');
    }

    // 4. Duplicate solve protection (Section 24)
    const { data: existingSolve } = await client
      .from('solves')
      .select('id')
      .eq('team_id', user.team_id)
      .eq('challenge_id', challengeId)
      .maybeSingle();

    if (existingSolve) {
      return {
        is_correct: false,
        already_solved: true,
        message: 'Your squad has already solved this challenge.',
      };
    }

    // 5. Cooldown & attempt rate limiting enforcement
    if (challenge.submission_cooldown_seconds > 0) {
      const cooldownWindow = new Date(
        Date.now() - challenge.submission_cooldown_seconds * 1000,
      ).toISOString();

      const { data: recentSubmissions } = await client
        .from('submissions')
        .select('submitted_at')
        .eq('challenge_id', challengeId)
        .eq('team_id', user.team_id)
        .gte('submitted_at', cooldownWindow)
        .limit(1);

      if (recentSubmissions && recentSubmissions.length > 0) {
        throw new HttpException(
          `Submission cooldown active. Please wait ${challenge.submission_cooldown_seconds}s between attempts.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Check max attempts limit
    if (challenge.max_attempts > 0) {
      const { count: attemptCount } = await client
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId)
        .eq('team_id', user.team_id);

      if (attemptCount !== null && attemptCount >= challenge.max_attempts) {
        throw new ForbiddenException(
          `Maximum submission attempts reached (${challenge.max_attempts}).`,
        );
      }
    }

    // 6. Cryptographic Flag Verification (Keyed HMAC-SHA256 & timingSafeEqual)
    const { data: flags, error: flagError } = await client
      .from('challenge_flags')
      .select('flag_hash, is_case_sensitive')
      .eq('challenge_id', challengeId);

    if (flagError || !flags || flags.length === 0) {
      this.logger.error(`No flags provisioned for challenge: ${challengeId}`);
      throw new InternalServerErrorException(
        'Challenge flag validation unavailable. Contact CTF staff.',
      );
    }

    let isCorrect = false;
    const submittedFlag = dto.flag.trim();

    for (const flagRecord of flags) {
      const candidateFlag = flagRecord.is_case_sensitive
        ? submittedFlag
        : submittedFlag.toLowerCase();

      if (this.supabaseService.verifyFlag(candidateFlag, flagRecord.flag_hash)) {
        isCorrect = true;
        break;
      }
    }

    // 7. Record submission in submissions audit table (Hashed IP & UA for anti-cheat)
    const ipHash = this.supabaseService.hashIp(ip);
    const uaHash = this.supabaseService.hashIp(userAgent);

    const { data: submissionRecord, error: subError } = await client
      .from('submissions')
      .insert({
        challenge_id: challengeId,
        team_id: user.team_id,
        user_id: user.id,
        is_correct: isCorrect,
        ip_hash: ipHash,
        user_agent_hash: uaHash,
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (subError || !submissionRecord) {
      this.logger.error(`Failed to record submission: ${subError?.message}`);
      throw new InternalServerErrorException('Failed to process flag submission.');
    }

    // 8. Outcome handling
    if (!isCorrect) {
      this.logger.warn(
        `Incorrect submission on [${challenge.name}] by team ${user.team_id} (user: ${user.username})`,
      );
      return {
        is_correct: false,
        already_solved: false,
        points_awarded: 0,
        message: 'Incorrect flag.',
      };
    }

    // Process solve via ScoringService
    const solveResult = await this.scoringService.processSolve({
      teamId: user.team_id,
      userId: user.id,
      challengeId: challenge.id,
      challengeName: challenge.name,
      basePoints: challenge.base_points,
      currentPoints: challenge.current_points || challenge.base_points,
      minimumPoints: challenge.minimum_points,
      firstBloodBonus: challenge.first_blood_bonus,
      submissionId: submissionRecord.id,
      isDynamicEnabled: settings?.dynamic_scoring_enabled ?? true,
      isFirstBloodEnabled: settings?.first_blood_enabled ?? true,
    });

    return {
      is_correct: true,
      already_solved: false,
      is_first_blood: solveResult.is_first_blood,
      points_awarded: solveResult.points_awarded,
      message: `Flag accepted! +${solveResult.points_awarded} Points awarded${
        solveResult.is_first_blood ? ' (🩸 FIRST BLOOD BONUS!)' : ''
      }.`,
    };
  }

  /**
   * Administrative view of submissions telemetry for anti-cheat & auditing.
   */
  async adminListSubmissions() {
    const client = this.supabaseService.getClient();

    const { data: submissions, error } = await client
      .from('submissions')
      .select(`
        id,
        challenge_id,
        team_id,
        user_id,
        is_correct,
        submitted_at,
        challenge:challenges(name),
        team:teams(name),
        user:users(username)
      `)
      .order('submitted_at', { ascending: false })
      .limit(200);

    if (error) {
      throw new InternalServerErrorException('Failed to query submissions log.');
    }

    return (submissions || []).map((s: any) => ({
      id: s.id,
      challenge_id: s.challenge_id,
      challenge_name: s.challenge?.name || 'Unknown',
      team_id: s.team_id,
      team_name: s.team?.name || 'Unknown',
      user_id: s.user_id,
      user_name: s.user?.username || 'Unknown',
      is_correct: s.is_correct,
      submitted_at: s.submitted_at,
    }));
  }
}
