import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Retrieves all registered achievement badges.
   */
  async listBadges() {
    const client = this.supabaseService.getClient();

    const { data: badges, error } = await client
      .from('badges')
      .select('id, name, description, icon_name, criteria_type, criteria_value, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Failed to retrieve badge catalog.');
    }

    return badges || [];
  }

  /**
   * Retrieves all badges earned by a squad.
   */
  async getTeamBadges(teamId: string) {
    const client = this.supabaseService.getClient();

    const { data: awards, error } = await client
      .from('team_badges')
      .select(`
        id,
        awarded_at,
        badge:badges(id, name, description, icon_name, criteria_type)
      `)
      .eq('team_id', teamId);

    if (error) {
      throw new InternalServerErrorException('Failed to retrieve squad badges.');
    }

    return (awards || []).map((a: any) => ({
      ...a.badge,
      awarded_at: a.awarded_at,
    }));
  }

  /**
   * Checks criteria and awards eligible badges to a squad (Section 59).
   */
  async evaluateAndAward(teamId: string) {
    const client = this.supabaseService.getClient();

    const { data: allBadges } = await client.from('badges').select('*');
    const { data: existingAwards } = await client
      .from('team_badges')
      .select('badge_id')
      .eq('team_id', teamId);

    const earnedBadgeIds = new Set((existingAwards || []).map((a) => a.badge_id));
    const newAwards: string[] = [];

    // Query solves for this team
    const { data: solves } = await client
      .from('solves')
      .select('challenge_id, is_first_blood, challenge:challenges(category_id, category:categories(slug))')
      .eq('team_id', teamId);

    const totalSolves = solves?.length || 0;
    const hasFirstBlood = solves?.some((s) => s.is_first_blood) || false;

    // Count solves per category slug
    const categorySolveCount = new Map<string, number>();
    if (solves) {
      for (const s of solves) {
        const slug = (s.challenge as any)?.category?.slug;
        if (slug) {
          categorySolveCount.set(slug, (categorySolveCount.get(slug) || 0) + 1);
        }
      }
    }

    for (const badge of allBadges || []) {
      if (earnedBadgeIds.has(badge.id)) continue;

      let qualifies = false;
      const critVal = badge.criteria_value as Record<string, any>;

      switch (badge.criteria_type) {
        case 'FIRST_BLOOD':
          qualifies = hasFirstBlood;
          break;
        case 'TOTAL_SOLVES':
          qualifies = totalSolves >= (critVal.count || 1);
          break;
        case 'CATEGORY_SOLVES':
          const targetCategory = critVal.category;
          const count = categorySolveCount.get(targetCategory) || 0;
          qualifies = count >= (critVal.count || 1);
          break;
        default:
          break;
      }

      if (qualifies) {
        const { error } = await client.from('team_badges').insert({
          team_id: teamId,
          badge_id: badge.id,
        });

        if (!error) {
          newAwards.push(badge.name);
          this.logger.log(`Squad ${teamId} awarded badge: [${badge.name}]`);
        }
      }
    }

    return newAwards;
  }
}
