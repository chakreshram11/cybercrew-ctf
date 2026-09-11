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

  const mockSuperAdminUser: AuthUser = {
    id: 'super-admin-1',
    username: 'superadmin',
    email: 'superadmin@ctf.com',
    role: 'SUPER_ADMIN',
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
          start_date: '2020-01-01T00:00:00Z',
          end_date: '2099-12-31T23:59:59Z',
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

  it('1. Admin can hide a challenge with no scenario', async () => {
    let callCount = 0;
    const hideClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'challenges') {
          callCount++;
          if (callCount === 1) {
            return createChainableQuery(mockVisibleChallenge);
          }
          return createChainableQuery(mockHiddenChallenge);
        }
        return createChainableQuery([]);
      }),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(hideClient);

    const updated = await challengesService.updateChallengeVisibility(
      'chal-vis-1',
      { is_visible: false },
      mockAdminUser,
    );
    expect(updated).toBeDefined();
    expect(updated.is_visible).toBe(false);

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('2. Admin can unhide a challenge with no scenario', async () => {
    let callCount = 0;
    const unhideClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'challenges') {
          callCount++;
          if (callCount === 1) {
            return createChainableQuery(mockHiddenChallenge);
          }
          return createChainableQuery(mockVisibleChallenge);
        }
        return createChainableQuery([]);
      }),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(unhideClient);

    const updated = await challengesService.updateChallengeVisibility(
      'chal-hid-1',
      { is_visible: true },
      mockAdminUser,
    );
    expect(updated).toBeDefined();
    expect(updated.is_visible).toBe(true);

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('3. Visibility update only requires challenges.id', async () => {
    let queriedFields = '';
    const idOnlyClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: jest.fn().mockImplementation((fields: string) => {
              queriedFields = fields;
              return createChainableQuery(mockVisibleChallenge);
            }),
            update: jest.fn().mockReturnValue(createChainableQuery(mockHiddenChallenge)),
          };
        }
        return createChainableQuery([]);
      }),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(idOnlyClient);

    const updated = await challengesService.updateChallengeVisibility('chal-vis-1', { is_visible: false }, mockAdminUser);
    expect(queriedFields).toBe('id, name');
    expect(updated).toBeDefined();

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('4. Missing challenge returns 404 "Challenge not found."', async () => {
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
    ).rejects.toThrow('Challenge not found.');

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('5. Scenario absence does NOT cause failure', async () => {
    const noScenarioChallenge = {
      id: 'chal-no-infra',
      name: 'Pure Spec Challenge',
      is_visible: true,
      scenario: null,
      container: null,
    };
    const client = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'challenges') {
          return createChainableQuery({ ...noScenarioChallenge, is_visible: false });
        }
        return createChainableQuery([]);
      }),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(client);

    const result = await challengesService.updateChallengeVisibility('chal-no-infra', { is_visible: false }, mockAdminUser);
    expect(result).toBeDefined();
    expect(result.is_visible).toBe(false);

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('6. ADMIN can toggle visibility', async () => {
    const updated = await challengesService.updateChallengeVisibility('chal-vis-1', { is_visible: false }, mockAdminUser);
    expect(updated).toBeDefined();
  });

  it('7. SUPER_ADMIN can toggle visibility', async () => {
    const updated = await challengesService.updateChallengeVisibility('chal-vis-1', { is_visible: false }, mockSuperAdminUser);
    expect(updated).toBeDefined();
  });

  it('9. Hide writes is_visible=false', async () => {
    let writtenPayload: any = null;
    const writeClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: jest.fn().mockReturnValue(createChainableQuery(mockVisibleChallenge)),
            update: jest.fn().mockImplementation((payload: any) => {
              writtenPayload = payload;
              return createChainableQuery({ ...mockVisibleChallenge, ...payload });
            }),
          };
        }
        return createChainableQuery([]);
      }),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(writeClient);

    await challengesService.updateChallengeVisibility('chal-vis-1', { is_visible: false }, mockAdminUser);
    expect(writtenPayload).toBeDefined();
    expect(writtenPayload.is_visible).toBe(false);

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('10. Unhide writes is_visible=true', async () => {
    let writtenPayload: any = null;
    const writeClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'challenges') {
          return {
            select: jest.fn().mockReturnValue(createChainableQuery(mockHiddenChallenge)),
            update: jest.fn().mockImplementation((payload: any) => {
              writtenPayload = payload;
              return createChainableQuery({ ...mockHiddenChallenge, ...payload });
            }),
          };
        }
        return createChainableQuery([]);
      }),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(writeClient);

    await challengesService.updateChallengeVisibility('chal-hid-1', { is_visible: true }, mockAdminUser);
    expect(writtenPayload).toBeDefined();
    expect(writtenPayload.is_visible).toBe(true);

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('11 & 12. CHALLENGE_HIDDEN and CHALLENGE_UNHIDDEN audit events are created', async () => {
    const insertedAudits: any[] = [];
    const auditClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'challenges') {
          return createChainableQuery(mockVisibleChallenge);
        }
        if (table === 'audit_logs') {
          return {
            insert: jest.fn().mockImplementation(async (data: any) => {
              insertedAudits.push(data);
              return { data, error: null };
            }),
          };
        }
        return createChainableQuery([]);
      }),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(auditClient);

    await challengesService.updateChallengeVisibility('chal-vis-1', { is_visible: false }, mockAdminUser);
    await challengesService.updateChallengeVisibility('chal-vis-1', { is_visible: true }, mockAdminUser);

    expect(insertedAudits.length).toBe(2);
    expect(insertedAudits[0].action).toBe('CHALLENGE_HIDDEN');
    expect(insertedAudits[0].resource_type).toBe('CHALLENGE');
    expect(insertedAudits[0].resource_id).toBe('chal-vis-1');
    expect(insertedAudits[1].action).toBe('CHALLENGE_UNHIDDEN');

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('13. Participant cannot access hidden challenge', async () => {
    const hiddenClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'competition_settings') {
          return createChainableQuery({
            start_date: '2020-01-01T00:00:00Z',
            end_date: '2099-12-31T23:59:59Z',
            state: 'LIVE',
          });
        }
        if (table === 'challenges') {
          return createChainableQuery(null);
        }
        return createChainableQuery([]);
      }),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(hiddenClient);

    await expect(
      challengesService.getPublicChallengeBySlug('hidden-challenge', mockParticipantUser),
    ).rejects.toThrow(NotFoundException);

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('14. Participant cannot submit flag to hidden challenge', async () => {
    const hiddenClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'challenges') {
          return createChainableQuery(mockHiddenChallenge);
        }
        if (table === 'competition_settings') {
          return createChainableQuery({
            start_date: '2020-01-01T00:00:00Z',
            end_date: '2099-12-31T23:59:59Z',
            state: 'LIVE',
          });
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

  it('15. Participant cannot unlock paid hint on hidden challenge', async () => {
    const hiddenClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'challenges') {
          return createChainableQuery(mockHiddenChallenge);
        }
        if (table === 'competition_settings') {
          return createChainableQuery({
            start_date: '2020-01-01T00:00:00Z',
            end_date: '2099-12-31T23:59:59Z',
            state: 'LIVE',
            hints_enabled: true,
          });
        }
        return createChainableQuery([]);
      }),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(hiddenClient);

    await expect(
      hintsService.unlockHint('chal-hid-1', 'hint-1', mockParticipantUser),
    ).rejects.toThrow(NotFoundException);

    (mockSupabaseService.getClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });
});
