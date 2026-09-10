import { Injectable, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../modules/supabase/supabase.service';
import { AuthUser } from '../decorators/current-user.decorator';

export interface CompetitionAccessStatus {
  isLive: boolean;
  isBeforeStart: boolean;
  isAfterEnd: boolean;
  startDate: string;
  endDate: string;
  state: string;
}

@Injectable()
export class CompetitionAccessService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Evaluates if the calling user possesses administrator or challenge author privileges.
   */
  isAdmin(user?: AuthUser): boolean {
    if (!user) return false;
    const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'CHALLENGE_AUTHOR', 'MODERATOR'];
    return adminRoles.includes(user.role);
  }

  /**
   * Retrieves current competition settings and determines the active window status.
   */
  async getCompetitionStatus(customDate?: Date): Promise<CompetitionAccessStatus> {
    const client = this.supabaseService.getClient();
    const { data: settings, error } = await client
      .from('competition_settings')
      .select('start_date, end_date, state')
      .eq('id', 1)
      .single();

    if (error || !settings) {
      // Fallback default if settings record is unavailable
      const defaultStart = new Date('2026-10-15T09:00:00Z');
      const defaultEnd = new Date('2026-10-17T21:00:00Z');
      const now = customDate || new Date();
      return {
        isLive: now >= defaultStart && now < defaultEnd,
        isBeforeStart: now < defaultStart,
        isAfterEnd: now >= defaultEnd,
        startDate: defaultStart.toISOString(),
        endDate: defaultEnd.toISOString(),
        state: 'LIVE',
      };
    }

    const now = customDate || new Date();
    const startDate = new Date(settings.start_date);
    const endDate = new Date(settings.end_date);

    const isBeforeStart = now.getTime() < startDate.getTime();
    const isAfterEnd = now.getTime() >= endDate.getTime();

    // Live window strictly requires: start_date <= now < end_date AND state is LIVE
    const isLive = !isBeforeStart && !isAfterEnd && (settings.state === 'LIVE' || settings.state === 'REGISTRATION_OPEN');

    return {
      isLive,
      isBeforeStart,
      isAfterEnd,
      startDate: settings.start_date,
      endDate: settings.end_date,
      state: settings.state,
    };
  }

  /**
   * Enforces competition window authorization for participant-facing challenge APIs.
   * Admins bypass competition window restrictions completely.
   */
  async validateParticipantAccess(user?: AuthUser, customDate?: Date): Promise<CompetitionAccessStatus> {
    if (this.isAdmin(user)) {
      return this.getCompetitionStatus(customDate);
    }

    const status = await this.getCompetitionStatus(customDate);

    if (status.isBeforeStart) {
      throw new ForbiddenException('Challenges are not available until the competition starts.');
    }

    if (status.isAfterEnd || status.state === 'ENDED' || status.state === 'ARCHIVED') {
      throw new ForbiddenException('The competition has ended and challenge access is closed.');
    }

    if (!status.isLive) {
      throw new ForbiddenException('Challenges are not currently active.');
    }

    return status;
  }
}
