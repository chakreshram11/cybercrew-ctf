import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { HintsService } from '../hints/hints.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { CompetitionAccessService } from '../../common/services/competition-access.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ScoringService } from '../scoring/scoring.service';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../../common/decorators/current-user.decorator';

describe('Challenge Visibility (Hide / Unhide) Suite', () => {
  let challengesService: ChallengesService;
  let hintsService: HintsService;
  let submissionsService: SubmissionsService;
  let competitionAccessService: CompetitionAccessService;

  const mockAdminUser: AuthUser = {
    id: 'admin-1',
    username: 'admin',
    email: 'admin@ctf.com',
    role: 'ADMIN',
  };

  const mockParticipantUser: AuthUser = {
    id: 'user-1',
    username: 'player1',
    email: 'player1@ctf.com',
    role: 'PARTICIPANT',
    team_id: 'team-1',
  };

  const mockVisibleChallenge = {
    id: 'chal-vis-1',
    name: 'Visible Challenge',
    slug: 'visible-challenge',
    base_points: 500,
    current_points: 500,
    minimum_points: 100,
    is_published: true,
    is_active: true,
    is_visible: true,
    hints: [],
  };

  const mockHiddenChallenge = {
    id: 'chal-hid-1',
    name: 'Hidden Challenge',
    slug: 'hidden-challenge',
    base_points: 500,
    current_points: 500,
    minimum_points: 100,
    is_published: true,
    is_active: true,
    is_visible: false,
    hints: [],
  };

  const createChainableQuery = (dataToReturn: any) => {
    const chain: any = {
      select: jest.fn().mockImplementation(() => chain),
      eq: jest.fn().mockImplementation(() => chain),
      or: jest.fn().mockImplementation(() => chain),
      order: jest.fn().mockImplementation(() => chain),
      limit: jest.fn().mockImplementation(() => chain),
      insert: jest.fn().mockImplementation(() => chain),
      update: jest.fn().mockImplementation(() => chain),
      delete: jest.fn().mockImplementation(() => chain),
      single: jest.fn().mockImplementation(async () => ({ data: Array.isArray(dataToReturn) ? dataToReturn[0] : dataToReturn, error: null })),
      maybeSingle: jest.fn().mockImplementation(async () => ({ data: Array.isArray(dataToReturn) ? dataToReturn[0] : dataToReturn, error: null })),
      then: (resolve: any) => resolve({ data: dataToReturn, error: null }),
    };
    return chain;
  };

  const mockSupabaseClient = {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'competition_settings') {
        return createChainableQuery({
          start_date: '2026-01-01T00:00:00Z',
          end_date: '2026-12-31T23:59:59Z',
          state: 'LIVE',
          dynamic_scoring_enabled: true,
          first_blood_enabled: true,
          hints_enabled: true,
        });
      }
      if (table === 'challenges') {
        return createChainableQuery([mockVisibleChallenge]);
      }
      if (table === 'challenge_flags') {
        return createChainableQuery([{ flag_hash: 'hashed-flag', is_case_sensitive: true }]);
      }
      if (table === 'challenge_hints') {
        return createChainableQuery([{ id: 'hint-1', title: 'Hint 1', cost: 10, is_active: true }]);
      }
      if (table === 'teams') {
        return createChainableQuery({ id: 'team-1', name: 'Team Alpha', score: 1000 });
      }
      if (table === 'submissions') {
        return createChainableQuery({ id: 'sub-1' });
      }
      return createChainableQuery([]);
    }),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
    hashFlag: jest.fn().mockReturnValue('hashed-flag'),
    verifyFlag: jest.fn().mockReturnValue(true),
    hashIp: jest.fn().mockReturnValue('hashed-ip'),
  };

  const mockScoringService = {
    computePoints: jest.fn().mockReturnValue(500),
    processSolve: jest.fn().mockResolvedValue({
      is_correct: true,
      is_first_blood: false,
      points_awarded: 500,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengesService,
        HintsService,
        SubmissionsService,
        CompetitionAccessService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ScoringService, useValue: mockScoringService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    challengesService = module.get<ChallengesService>(ChallengesService);
    hintsService = module.get<HintsService>(HintsService);
    submissionsService = module.get<SubmissionsService>(SubmissionsService);
    competitionAccessService = module.get<CompetitionAccessService>(CompetitionAccessService);
  });

  it('1. Admin can hide a challenge via updateChallengeVisibility', async () => {
    const updated = await challengesService.updateChallengeVisibility(
      'chal-vis-1',
      { is_visible: false },
      mockAdminUser,
    );
    expect(updated).toBeDefined();
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_logs');
  });

  it('2. Admin can unhide a challenge via updateChallengeVisibility', async () => {
    const updated = await challengesService.updateChallengeVisibility(
      'chal-vis-1',
      { is_visible: true },
      mockAdminUser,
    );
    expect(updated).toBeDefined();
  });

  it('3. Admin can list all challenges including hidden challenges', async () => {
    const challenges = await challengesService.adminListChallenges();
    expect(challenges).toBeDefined();
  });

  it('4. Participant flag submission to hidden challenge is REJECTED', async () => {
    const hiddenClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'challenges') {
          return createChainableQuery(mockHiddenChallenge);
        }
        if (table === 'competition_settings') {
          return createChainableQuery({ state: 'LIVE' });
        }
        return createChainableQuery([]);
      }),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(hiddenClient);

    await expect(
      submissionsService.submitFlag('chal-hid-1', { flag: 'CCCTF{test}' }, mockParticipantUser, '127.0.0.1', 'UA'),
    ).rejects.toThrow(ForbiddenException);

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('6. Admin challenge list falls back gracefully when is_visible column is missing in schema', async () => {
    let callCount = 0;
    const fallbackClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'challenges') {
          callCount++;
          if (callCount === 1) {
            return {
              select: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: "column challenges.is_visible does not exist", code: "PGRST204" },
                }),
              }),
            };
          }
          return createChainableQuery([mockVisibleChallenge]);
        }
        return createChainableQuery([]);
      }),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(fallbackClient);

    const challenges = await challengesService.adminListChallenges();
    expect(challenges).toBeDefined();
    expect(challenges.length).toBeGreaterThan(0);
    expect(challenges[0].is_visible).toBe(true);

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('8. Admin can hide a challenge with no scenario or container infrastructure', async () => {
    const noScenarioChallenge = {
      id: 'chal-no-scenario',
      name: 'Static Spec Challenge',
      slug: 'static-spec-challenge',
      is_visible: true,
      target: null,
    };
    const updatedScenarioChallenge = {
      ...noScenarioChallenge,
      is_visible: false,
    };
    let callCount = 0;
    const noScenarioClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'challenges') {
          callCount++;
          if (callCount === 1) {
            return createChainableQuery(noScenarioChallenge);
          }
          return createChainableQuery(updatedScenarioChallenge);
        }
        return createChainableQuery([]);
      }),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(noScenarioClient);

    const updated = await challengesService.updateChallengeVisibility('chal-no-scenario', { is_visible: false }, mockAdminUser);
    expect(updated).toBeDefined();
    expect(updated.is_visible).toBe(false);

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('9. Non-existent challenge returns 404 "Challenge not found."', async () => {
    const notFoundClient = {
      from: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(notFoundClient);

    await expect(
      challengesService.updateChallengeVisibility('non-existent-uuid', { is_visible: false }, mockAdminUser),
    ).rejects.toThrow(NotFoundException);

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });
});
