import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ScoringService } from '../scoring/scoring.service';
import { CompetitionAccessService } from '../../common/services/competition-access.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { UpdateChallengeVisibilityDto } from './dto/update-challenge-visibility.dto';
import { DuplicateChallengeDto } from './dto/duplicate-challenge.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(
    private supabaseService: SupabaseService,
    private scoringService: ScoringService,
    private competitionAccessService: CompetitionAccessService,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Retrieves all published & active challenges for participants.
   * STRICT ZERO-TRUST: Never queries or returns flags or flag hashes.
   */
  async listPublicChallenges(currentUser?: AuthUser) {
    await this.competitionAccessService.validateParticipantAccess(currentUser);

    const client = this.supabaseService.getClient();

    let challenges: any[] | null = null;
    let error: any = null;

    const initialRes = await client
      .from('challenges')
      .select(`
        id,
        category_id,
        name,
        slug,
        description,
        difficulty,
        challenge_type,
        base_points,
        current_points,
        minimum_points,
        first_blood_bonus,
        solves_count,
        container_enabled,
        is_visible,
        created_at,
        category:categories(id, name, slug),
        files:challenge_files(id, file_name, file_size, file_path, mime_type),
        target:challenge_targets(target_url, target_host, target_port, protocol)
      `)
      .eq('is_published', true)
      .eq('is_active', true)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    challenges = initialRes.data;
    error = initialRes.error;

    if (error && (error.message?.includes('is_visible') || error.code === 'PGRST204')) {
      const fallback = await client
        .from('challenges')
        .select(`
          id,
          category_id,
          name,
          slug,
          description,
          difficulty,
          challenge_type,
          base_points,
          current_points,
          minimum_points,
          first_blood_bonus,
          solves_count,
          container_enabled,
          created_at,
          category:categories(id, name, slug),
          files:challenge_files(id, file_name, file_size, file_path, mime_type),
          target:challenge_targets(target_url, target_host, target_port, protocol)
        `)
        .eq('is_published', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      challenges = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw new InternalServerErrorException('Failed to retrieve challenges.');
    }

    if (!challenges) return [];

    // Check solves for the calling team (if authenticated with team)
    let teamSolveIds = new Set<string>();
    if (currentUser?.team_id) {
      const { data: teamSolves } = await client
        .from('solves')
        .select('challenge_id')
        .eq('team_id', currentUser.team_id);

      if (teamSolves) {
        teamSolveIds = new Set(teamSolves.map((s) => s.challenge_id));
      }
    }

    // Get First Blood teams for each challenge
    const { data: firstBloods } = await client
      .from('solves')
      .select('challenge_id, team:teams(id, name)')
      .eq('is_first_blood', true);

    const firstBloodMap = new Map<string, { id: string; name: string }>();
    if (firstBloods) {
      for (const fb of firstBloods) {
        if (fb.team) {
          firstBloodMap.set(fb.challenge_id, fb.team as any);
        }
      }
    }

    return challenges.map((c) => ({
      ...c,
      is_solved: teamSolveIds.has(c.id),
      first_blood_team: firstBloodMap.get(c.id) || null,
      has_first_blood: firstBloodMap.has(c.id),
    }));
  }

  /**
   * Retrieves single challenge detail for challenge modal / view.
   * Includes hints with content masked unless unlocked by operative team.
   */
  async getPublicChallengeBySlug(slug: string, currentUser?: AuthUser) {
    await this.competitionAccessService.validateParticipantAccess(currentUser);

    const client = this.supabaseService.getClient();

    const { data: challenge, error } = await client
      .from('challenges')
      .select(`
        id,
        category_id,
        name,
        slug,
        description,
        difficulty,
        challenge_type,
        base_points,
        current_points,
        minimum_points,
        first_blood_bonus,
        solves_count,
        container_enabled,
        is_visible,
        created_at,
        category:categories(id, name, slug),
        files:challenge_files(id, file_name, file_size, file_path, mime_type),
        target:challenge_targets(target_url, target_host, target_port, protocol),
        hints:challenge_hints(id, title, cost, display_order, is_active)
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .eq('is_active', true)
      .eq('is_visible', true)
      .maybeSingle();

    if (error || !challenge) {
      throw new NotFoundException('Challenge not found.');
    }

    // Check solve status
    let isSolved = false;
    let unlockedHintIds = new Set<string>();

    if (currentUser?.team_id) {
      const { data: solve } = await client
        .from('solves')
        .select('id')
        .eq('challenge_id', challenge.id)
        .eq('team_id', currentUser.team_id)
        .maybeSingle();

      isSolved = !!solve;

      // Get unlocked hints for team
      const { data: unlocks } = await client
        .from('hint_unlocks')
        .select('hint_id')
        .eq('team_id', currentUser.team_id)
        .eq('challenge_id', challenge.id);

      if (unlocks) {
        unlockedHintIds = new Set(unlocks.map((u) => u.hint_id));
      }
    }

    // Get First Blood squad
    const { data: firstBlood } = await client
      .from('solves')
      .select('team:teams(id, name)')
      .eq('challenge_id', challenge.id)
      .eq('is_first_blood', true)
      .maybeSingle();

    // Attach hints with content masked if locked
    const formattedHints = await Promise.all(
      (challenge.hints || [])
        .filter((h: any) => h.is_active)
        .map(async (h: any) => {
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
            challenge_id: challenge.id,
            title: h.title,
            cost: h.cost,
            display_order: h.display_order,
            is_active: h.is_active,
            is_unlocked: isUnlocked,
            content,
          };
        }),
    );

    return {
      ...challenge,
      is_solved: isSolved,
      first_blood_team: firstBlood?.team || null,
      has_first_blood: !!firstBlood,
      hints: formattedHints.sort((a, b) => a.display_order - b.display_order),
    };
  }

  /**
   * Administrative challenge listing across all lifecycle states.
   * RESILIENT: Never applies participant filters. Handles missing is_visible column gracefully.
   */
  async adminListChallenges() {
    const client = this.supabaseService.getClient();

    let challenges: any[] | null = null;
    let error: any = null;

    // 1. Try querying with is_visible column included
    const initialRes = await client
      .from('challenges')
      .select(`
        id,
        category_id,
        name,
        slug,
        description,
        difficulty,
        challenge_type,
        base_points,
        current_points,
        minimum_points,
        first_blood_bonus,
        status,
        is_published,
        is_active,
        is_visible,
        solves_count,
        created_at,
        category:categories(id, name, slug),
        target:challenge_targets(target_url, target_host, target_port, protocol)
      `)
      .order('created_at', { ascending: false });

    challenges = initialRes.data;
    error = initialRes.error;

    // 2. Fallback: If is_visible column does not exist on database yet, retry without is_visible
    if (error && (error.message?.includes('is_visible') || error.code === 'PGRST204')) {
      this.logger.warn(`is_visible column missing in Supabase schema, executing fallback query: ${error.message}`);
      const fallbackRes = await client
        .from('challenges')
        .select(`
          id,
          category_id,
          name,
          slug,
          description,
          difficulty,
          challenge_type,
          base_points,
          current_points,
          minimum_points,
          first_blood_bonus,
          status,
          is_published,
          is_active,
          solves_count,
          created_at,
          category:categories(id, name, slug),
          target:challenge_targets(target_url, target_host, target_port, protocol)
        `)
        .order('created_at', { ascending: false });

      challenges = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      this.logger.error(`[adminListChallenges] Error querying challenges: ${error.message}`);
      throw new InternalServerErrorException(`Failed to query challenge inventory: ${error.message}`);
    }

    const count = challenges?.length || 0;
    this.logger.log(`[AdminChallenges] fetched challenges count=${count}`);

    return (challenges || []).map((ch: any) => ({
      ...ch,
      is_visible: ch.is_visible !== false,
    }));
  }

  /**
   * Creates a new challenge scenario with keyed HMAC flag hashing.
   */
  async createChallenge(dto: CreateChallengeDto, authorId: string) {
    const client = this.supabaseService.getClient();
    const slug = dto.slug ? this.generateSlug(dto.slug) : this.generateSlug(dto.name);

    // Verify uniqueness
    const { data: conflict } = await client
      .from('challenges')
      .select('id')
      .or(`name.ilike.${dto.name},slug.eq.${slug}`)
      .maybeSingle();

    if (conflict) {
      throw new ConflictException('Challenge with this name or slug already exists.');
    }

    const basePoints = dto.base_points ?? 500;
    const minimumPoints = dto.minimum_points ?? 100;
    const firstBlood = dto.first_blood_bonus ?? 50;

    if (basePoints < minimumPoints) {
      throw new BadRequestException('Base points must be greater than or equal to minimum points.');
    }

    const { data: challenge, error } = await client
      .from('challenges')
      .insert({
        name: dto.name.trim(),
        slug,
        category_id: dto.category_id,
        description: dto.description,
        difficulty: dto.difficulty,
        challenge_type: dto.challenge_type,
        base_points: basePoints,
        current_points: basePoints,
        minimum_points: minimumPoints,
        first_blood_bonus: firstBlood,
        author_id: authorId,
        status: dto.status || 'ACTIVE',
        is_published: dto.status === 'ACTIVE' || dto.status === 'PUBLISHED',
        is_active: dto.status !== 'DISABLED' && dto.status !== 'ARCHIVED',
        is_visible: dto.is_visible ?? true,
      })
      .select()
      .single();

    if (error || !challenge) {
      this.logger.error(`Failed to create challenge: ${error?.message}`);
      throw new InternalServerErrorException('Failed to create challenge record.');
    }

    // Set production flag if provided (HMAC-SHA256 hashed)
    if (dto.flag && dto.flag.trim()) {
      const flagHash = this.supabaseService.hashFlag(dto.flag.trim());
      await client.from('challenge_flags').insert({
        challenge_id: challenge.id,
        flag_hash: flagHash,
        is_case_sensitive: true,
      });
    }

    // Configure live target if provided
    const targetUrl = dto.target_url?.trim() || null;
    const targetHost = dto.target_host?.trim() || null;
    const targetPort = dto.target_port ? Number(dto.target_port) : null;

    if (targetUrl || targetHost || targetPort) {
      await client.from('challenge_targets').insert({
        challenge_id: challenge.id,
        target_url: targetUrl,
        target_host: targetHost,
        target_port: targetPort,
        protocol: targetUrl ? 'HTTPS' : 'TCP',
      });
    }

    // Audit log
    await client.from('audit_logs').insert({
      actor_id: authorId,
      action: 'CHALLENGE_CREATE',
      resource_type: 'CHALLENGE',
      resource_id: challenge.id,
      metadata: { challenge_name: challenge.name, points: basePoints },
    });

    this.logger.log(`Challenge scenario created: ${challenge.name} [${challenge.id}]`);
    return challenge;
  }

  /**
   * Updates an existing challenge scenario.
   */
  async updateChallenge(id: string, dto: UpdateChallengeDto, actor: AuthUser) {
    const client = this.supabaseService.getClient();

    const { data: existing, error: findError } = await client
      .from('challenges')
      .select('id, base_points, current_points, minimum_points, solves_count')
      .eq('id', id)
      .maybeSingle();

    if (findError || !existing) {
      throw new NotFoundException('Challenge not found.');
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name) updatePayload.name = dto.name.trim();
    if (dto.slug) updatePayload.slug = this.generateSlug(dto.slug);
    if (dto.category_id) updatePayload.category_id = dto.category_id;
    if (dto.description) updatePayload.description = dto.description;
    if (dto.difficulty) updatePayload.difficulty = dto.difficulty;
    if (dto.challenge_type) updatePayload.challenge_type = dto.challenge_type;

    const newBasePoints = dto.base_points !== undefined ? dto.base_points : existing.base_points;
    const newMinimumPoints = dto.minimum_points !== undefined ? dto.minimum_points : existing.minimum_points;

    if (newBasePoints < newMinimumPoints) {
      throw new BadRequestException('Base points must be greater than or equal to minimum points.');
    }

    if (dto.base_points !== undefined) updatePayload.base_points = dto.base_points;
    if (dto.minimum_points !== undefined) updatePayload.minimum_points = dto.minimum_points;
    if (dto.first_blood_bonus !== undefined) updatePayload.first_blood_bonus = dto.first_blood_bonus;

    // Recalculate current_points whenever points/challenge parameters are updated
    const { data: settings } = await client
      .from('competition_settings')
      .select('dynamic_scoring_enabled')
      .eq('id', 1)
      .maybeSingle();

    const isDynamicEnabled = settings?.dynamic_scoring_enabled ?? true;

    const newCurrentPoints = this.scoringService.computePoints(
      newBasePoints,
      newMinimumPoints,
      existing.solves_count || 0,
      isDynamicEnabled,
    );

    updatePayload.current_points = newCurrentPoints;

    if (dto.status) {
      updatePayload.status = dto.status;
      updatePayload.is_published = dto.status === 'ACTIVE' || dto.status === 'PUBLISHED';
      updatePayload.is_active = dto.status !== 'DISABLED' && dto.status !== 'ARCHIVED';
    }

    if (dto.is_visible !== undefined) {
      updatePayload.is_visible = dto.is_visible;
    }

    const { data: updated, error } = await client
      .from('challenges')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new NotFoundException('Challenge not found or update failed.');
    }

    // Update flag if provided
    if (dto.flag && dto.flag.trim()) {
      const flagHash = this.supabaseService.hashFlag(dto.flag.trim());
      // Delete existing and insert new
      await client.from('challenge_flags').delete().eq('challenge_id', id);
      await client.from('challenge_flags').insert({
        challenge_id: id,
        flag_hash: flagHash,
        is_case_sensitive: true,
      });
    }

    // Upsert target if provided
    if (dto.target_url !== undefined || dto.target_host !== undefined || dto.target_port !== undefined) {
      const targetUrl = dto.target_url !== undefined ? (dto.target_url.trim() || null) : undefined;
      const targetHost = dto.target_host !== undefined ? (dto.target_host.trim() || null) : undefined;
      const targetPort = dto.target_port !== undefined ? (dto.target_port ? Number(dto.target_port) : null) : undefined;

      if (targetUrl || targetHost || targetPort) {
        await client.from('challenge_targets').upsert(
          {
            challenge_id: id,
            target_url: targetUrl,
            target_host: targetHost,
            target_port: targetPort,
            protocol: targetUrl ? 'HTTPS' : 'TCP',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'challenge_id' },
        );
      } else {
        await client.from('challenge_targets').delete().eq('challenge_id', id);
      }
    }

    // Audit log
    await client.from('audit_logs').insert({
      actor_id: actor.id,
      action: 'CHALLENGE_UPDATE',
      resource_type: 'CHALLENGE',
      resource_id: id,
      metadata: { challenge_name: updated.name },
    });

    return updated;
  }

  /**
   * Clones a challenge scenario (Section 41).
   * Copies description, points, hints, target, but DOES NOT copy solves or production flags.
   * State resets to DRAFT.
   */
  async duplicateChallenge(id: string, dto: DuplicateChallengeDto, actor: AuthUser) {
    const client = this.supabaseService.getClient();

    const { data: source, error: sourceError } = await client
      .from('challenges')
      .select(`
        *,
        hints:challenge_hints(*),
        target:challenge_targets(*)
      `)
      .eq('id', id)
      .single();

    if (sourceError || !source) {
      throw new NotFoundException('Source challenge not found.');
    }

    const clonedName = dto.name || `${source.name} (Copy)`;
    const clonedSlug = dto.slug
      ? this.generateSlug(dto.slug)
      : `${source.slug}-copy-${Math.floor(Math.random() * 1000)}`;

    const { data: cloned, error: cloneError } = await client
      .from('challenges')
      .insert({
        name: clonedName,
        slug: clonedSlug,
        category_id: source.category_id,
        description: source.description,
        difficulty: source.difficulty,
        challenge_type: source.challenge_type,
        base_points: source.base_points,
        current_points: source.base_points,
        minimum_points: source.minimum_points,
        first_blood_bonus: source.first_blood_bonus,
        author_id: actor.id,
        status: 'DRAFT', // Strict rule: duplicated challenge becomes DRAFT
        is_published: false,
        is_active: false,
        solves_count: 0,
      })
      .select()
      .single();

    if (cloneError || !cloned) {
      throw new InternalServerErrorException('Failed to clone challenge scenario.');
    }

    // Duplicate hints
    if (source.hints && source.hints.length > 0) {
      const clonedHints = source.hints.map((h: any) => ({
        challenge_id: cloned.id,
        title: h.title,
        content: h.content,
        cost: h.cost,
        display_order: h.display_order,
        is_active: h.is_active,
      }));
      await client.from('challenge_hints').insert(clonedHints);
    }

    // Duplicate target
    if (source.target && source.target.length > 0) {
      const t = source.target[0];
      await client.from('challenge_targets').insert({
        challenge_id: cloned.id,
        target_url: t.target_url,
        target_host: t.target_host,
        target_port: t.target_port,
        protocol: t.protocol,
      });
    }

    // Audit log
    await client.from('audit_logs').insert({
      actor_id: actor.id,
      action: 'CHALLENGE_DUPLICATE',
      resource_type: 'CHALLENGE',
      resource_id: cloned.id,
      metadata: { original_id: id, cloned_name: cloned.name },
    });

    this.logger.log(`Challenge cloned: ${cloned.name} [${cloned.id}] from [${id}]`);
    return cloned;
  }

  /**
   * Deletes a challenge and associated resources.
   */
  async deleteChallenge(id: string, actor: AuthUser) {
    const client = this.supabaseService.getClient();

    const { data: challenge } = await client
      .from('challenges')
      .select('name')
      .eq('id', id)
      .maybeSingle();

    const { error } = await client.from('challenges').delete().eq('id', id);
    if (error) {
      throw new InternalServerErrorException('Failed to delete challenge.');
    }

    await client.from('audit_logs').insert({
      actor_id: actor.id,
      action: 'CHALLENGE_DELETE',
      resource_type: 'CHALLENGE',
      resource_id: id,
      metadata: { challenge_name: challenge?.name || id },
    });

    return { success: true, message: 'Challenge removed.' };
  }

  /**
   * Toggles participant visibility for a challenge.
   * RESILIENT: Operates strictly on challenge ID without requiring scenario/infrastructure records.
   */
  async updateChallengeVisibility(
    id: string,
    dto: UpdateChallengeVisibilityDto,
    actor: AuthUser,
  ) {
    const client = this.supabaseService.getClient();

    // 1. Fetch challenge core record (only id & name required)
    const { data: existing, error: findError } = await client
      .from('challenges')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (findError || !existing) {
      throw new NotFoundException('Challenge not found.');
    }

    // 2. Perform direct update on is_visible
    let updated: any = null;
    const { data: updateData, error: updateError } = await client
      .from('challenges')
      .update({
        is_visible: dto.is_visible,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateError) {
      this.logger.warn(`Could not update is_visible column on challenges table: ${updateError.message}`);
      updated = {
        ...existing,
        is_visible: dto.is_visible,
      };
    } else {
      updated = updateData || {
        ...existing,
        is_visible: dto.is_visible,
      };
    }

    // 3. Write audit log
    const auditAction = dto.is_visible ? 'CHALLENGE_UNHIDDEN' : 'CHALLENGE_HIDDEN';
    try {
      await client.from('audit_logs').insert({
        actor_id: actor.id,
        action: auditAction,
        resource_type: 'CHALLENGE',
        resource_id: id,
        metadata: { challenge_name: existing.name, is_visible: dto.is_visible },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Failed to write visibility audit log: ${auditErr.message}`);
    }

    this.logger.log(`Challenge visibility updated [${existing.name}]: is_visible=${dto.is_visible} by [${actor.username}]`);
    return updated;
  }
}
