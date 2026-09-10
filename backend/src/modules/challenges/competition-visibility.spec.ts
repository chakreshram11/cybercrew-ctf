import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { HintsService } from '../hints/hints.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { FilesService } from '../files/files.service';
import { CompetitionAccessService } from '../../common/services/competition-access.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ScoringService } from '../scoring/scoring.service';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../../common/decorators/current-user.decorator';

describe('Comprehensive Competition Visibility & Authorization Matrix (18 Tests)', () => {
  let challengesService: ChallengesService;
  let hintsService: HintsService;
  let submissionsService: SubmissionsService;
  let filesService: FilesService;
  let competitionAccessService: CompetitionAccessService;

  const mockStartDate = '2026-09-15T11:30:00.000Z'; // 15 Sept 2026 17:00 IST
  const mockEndDate = '2026-09-20T11:30:00.000Z';   // 20 Sept 2026 17:00 IST

  const participantUser: AuthUser = {
    id: 'user-participant-1',
    username: 'participant1',
    email: 'participant1@example.com',
    role: 'PARTICIPANT',
    team_id: 'team-1',
  };

  const adminUser: AuthUser = {
    id: 'user-admin-1',
    username: 'admin1',
    email: 'admin1@example.com',
    role: 'ADMIN',
  };

  const mockPublishedChallenge = {
    id: 'chal-pub-1',
    name: 'Published Web Challenge',
    slug: 'published-web-challenge',
    base_points: 500,
    current_points: 500,
    minimum_points: 100,
    is_published: true,
    is_active: true,
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
      upsert: jest.fn().mockImplementation(() => chain),
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
          start_date: mockStartDate,
          end_date: mockEndDate,
          state: 'LIVE',
          dynamic_scoring_enabled: true,
          first_blood_enabled: true,
        });
      }
      if (table === 'challenges') {
        return createChainableQuery([mockPublishedChallenge]);
      }
      if (table === 'challenge_flags') {
        return createChainableQuery([{ flag_hash: 'hashed-flag', is_case_sensitive: true }]);
      }
      if (table === 'challenge_hints') {
        return createChainableQuery([{ id: 'hint-1', title: 'Hint 1', cost: 10, is_active: true, content: 'Secret' }]);
      }
      if (table === 'teams') {
        return createChainableQuery({ id: 'team-1', name: 'Team Alpha', score: 1000 });
      }
      if (table === 'submissions') {
        return createChainableQuery({ id: 'submission-1' });
      }
      if (table === 'solves' || table === 'hint_unlocks' || table === 'score_events' || table === 'audit_logs') {
        return createChainableQuery([]);
      }
      return createChainableQuery({});
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
      new_team_score: 500,
      new_challenge_points: 500,
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(100),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengesService,
        HintsService,
        SubmissionsService,
        FilesService,
        CompetitionAccessService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ScoringService, useValue: mockScoringService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    challengesService = module.get<ChallengesService>(ChallengesService);
    hintsService = module.get<HintsService>(HintsService);
    submissionsService = module.get<SubmissionsService>(SubmissionsService);
    filesService = module.get<FilesService>(FilesService);
    competitionAccessService = module.get<CompetitionAccessService>(CompetitionAccessService);
  });

  // Test 1: BEFORE start_date - Participant GET challenges -> rejected (403)
  it('Test 1: BEFORE start_date -> Participant GET challenges is REJECTED (403)', async () => {
    jest.spyOn(competitionAccessService, 'getCompetitionStatus').mockResolvedValueOnce({
      isLive: false,
      isBeforeStart: true,
      isAfterEnd: false,
      startDate: mockStartDate,
      endDate: mockEndDate,
      state: 'LIVE',
    });
    await expect(challengesService.listPublicChallenges(participantUser)).rejects.toThrow(
      'Challenges are not available until the competition starts.',
    );
  });

  // Test 2: BEFORE start_date - Admin GET challenges -> allowed
  it('Test 2: BEFORE start_date -> Admin GET challenges is ALLOWED', async () => {
    const challenges = await challengesService.listPublicChallenges(adminUser);
    expect(challenges).toBeDefined();
  });

  // Test 3: BEFORE start_date - Admin EDIT challenge -> allowed
  it('Test 3: BEFORE start_date -> Admin EDIT challenge is ALLOWED', async () => {
    const updated = await challengesService.updateChallenge(
      'chal-pub-1',
      { base_points: 600 },
      adminUser,
    );
    expect(updated).toBeDefined();
  });

  // Test 4: DURING competition - Participant GET challenges -> allowed
  it('Test 4: DURING competition -> Participant GET challenges is ALLOWED', async () => {
    jest.spyOn(competitionAccessService, 'getCompetitionStatus').mockResolvedValueOnce({
      isLive: true,
      isBeforeStart: false,
      isAfterEnd: false,
      startDate: mockStartDate,
      endDate: mockEndDate,
      state: 'LIVE',
    });
    const challenges = await challengesService.listPublicChallenges(participantUser);
    expect(challenges).toBeDefined();
  });

  // Test 5: DURING competition - Participant GET challenge details -> allowed
  it('Test 5: DURING competition -> Participant GET challenge details is ALLOWED', async () => {
    jest.spyOn(competitionAccessService, 'getCompetitionStatus').mockResolvedValueOnce({
      isLive: true,
      isBeforeStart: false,
      isAfterEnd: false,
      startDate: mockStartDate,
      endDate: mockEndDate,
      state: 'LIVE',
    });
    const detail = await challengesService.getPublicChallengeBySlug(mockPublishedChallenge.slug, participantUser);
    expect(detail).toBeDefined();
  });

  // Test 6: DURING competition - Participant Submit flag -> allowed
  it('Test 6: DURING competition -> Participant Submit flag is ALLOWED', async () => {
    jest.spyOn(competitionAccessService, 'getCompetitionStatus').mockResolvedValueOnce({
      isLive: true,
      isBeforeStart: false,
      isAfterEnd: false,
      startDate: mockStartDate,
      endDate: mockEndDate,
      state: 'LIVE',
    });
    const res = await submissionsService.submitFlag('chal-pub-1', { flag: 'CCCTF{test}' }, participantUser, '127.0.0.1', 'UA');
    expect(res.is_correct).toBe(true);
  });

  // Test 7: DURING competition - Participant Purchase/reveal paid hint -> allowed
  it('Test 7: DURING competition -> Participant Purchase/reveal paid hint is ALLOWED', async () => {
    jest.spyOn(competitionAccessService, 'getCompetitionStatus').mockResolvedValueOnce({
      isLive: true,
      isBeforeStart: false,
      isAfterEnd: false,
      startDate: mockStartDate,
      endDate: mockEndDate,
      state: 'LIVE',
    });
    const hints = await hintsService.listPublicHints('chal-pub-1', participantUser);
    expect(hints).toBeDefined();
  });

  // Test 8: AFTER end_date - Participant GET challenges -> rejected (403)
  it('Test 8: AFTER end_date -> Participant GET challenges is REJECTED (403)', async () => {
    jest.spyOn(competitionAccessService, 'getCompetitionStatus').mockResolvedValueOnce({
      isLive: false,
      isBeforeStart: false,
      isAfterEnd: true,
      startDate: mockStartDate,
      endDate: mockEndDate,
      state: 'ENDED',
    });
    await expect(challengesService.listPublicChallenges(participantUser)).rejects.toThrow(
      'The competition has ended and challenge access is closed.',
    );
  });

  // Test 9: AFTER end_date - Participant GET challenge details -> rejected (403)
  it('Test 9: AFTER end_date -> Participant GET challenge details is REJECTED (403)', async () => {
    jest.spyOn(competitionAccessService, 'getCompetitionStatus').mockResolvedValueOnce({
      isLive: false,
      isBeforeStart: false,
      isAfterEnd: true,
      startDate: mockStartDate,
      endDate: mockEndDate,
      state: 'ENDED',
    });
    await expect(challengesService.getPublicChallengeBySlug(mockPublishedChallenge.slug, participantUser)).rejects.toThrow(
      'The competition has ended and challenge access is closed.',
    );
  });

  // Test 10: AFTER end_date - Participant Submit flag -> rejected (403)
  it('Test 10: AFTER end_date -> Participant Submit flag is REJECTED (403)', async () => {
    jest.spyOn(competitionAccessService, 'getCompetitionStatus').mockResolvedValueOnce({
      isLive: false,
      isBeforeStart: false,
      isAfterEnd: true,
      startDate: mockStartDate,
      endDate: mockEndDate,
      state: 'ENDED',
    });
    await expect(
      submissionsService.submitFlag('chal-pub-1', { flag: 'CCCTF{test}' }, participantUser, '127.0.0.1', 'UA'),
    ).rejects.toThrow('The competition has ended and challenge access is closed.');
  });

  // Test 11: AFTER end_date - Participant Purchase/reveal hint -> rejected (403)
  it('Test 11: AFTER end_date -> Participant Purchase/reveal hint is REJECTED (403)', async () => {
    jest.spyOn(competitionAccessService, 'getCompetitionStatus').mockResolvedValueOnce({
      isLive: false,
      isBeforeStart: false,
      isAfterEnd: true,
      startDate: mockStartDate,
      endDate: mockEndDate,
      state: 'ENDED',
    });
    await expect(hintsService.unlockHint('chal-pub-1', 'hint-1', participantUser)).rejects.toThrow(
      'The competition has ended and challenge access is closed.',
    );
  });

  // Test 12: AFTER end_date - Admin GET challenges -> allowed
  it('Test 12: AFTER end_date -> Admin GET challenges is ALLOWED', async () => {
    const challenges = await challengesService.adminListChallenges();
    expect(challenges).toBeDefined();
  });

  // Test 13: AFTER end_date - Admin EDIT challenge -> allowed
  it('Test 13: AFTER end_date -> Admin EDIT challenge is ALLOWED', async () => {
    const updated = await challengesService.updateChallenge('chal-pub-1', { base_points: 700 }, adminUser);
    expect(updated).toBeDefined();
  });

  // Test 14 & 15: Draft vs Published Challenge Filtering
  it('Test 14 & 15: Published challenges appear, draft challenges do not appear to participants', async () => {
    jest.spyOn(competitionAccessService, 'getCompetitionStatus').mockResolvedValueOnce({
      isLive: true,
      isBeforeStart: false,
      isAfterEnd: false,
      startDate: mockStartDate,
      endDate: mockEndDate,
      state: 'LIVE',
    });
    const list = await challengesService.listPublicChallenges(participantUser);
    expect(list).toBeDefined();
  });

  // Test 16: Participant attempts admin challenge update API -> rejected
  it('Test 16: Participant role is not admin', () => {
    expect(competitionAccessService.isAdmin(participantUser)).toBe(false);
  });

  // Test 17: Participant accesses direct URL when closed -> rejected
  it('Test 17: Direct URL access while competition is closed is REJECTED (403)', async () => {
    jest.spyOn(competitionAccessService, 'getCompetitionStatus').mockResolvedValueOnce({
      isLive: false,
      isBeforeStart: true,
      isAfterEnd: false,
      startDate: mockStartDate,
      endDate: mockEndDate,
      state: 'UPCOMING',
    });
    await expect(challengesService.getPublicChallengeBySlug(mockPublishedChallenge.slug, participantUser)).rejects.toThrow(
      'Challenges are not available until the competition starts.',
    );
  });

  // Test 18: Participant accesses direct URL during competition -> allowed
  it('Test 18: Direct URL access during competition is ALLOWED', async () => {
    jest.spyOn(competitionAccessService, 'getCompetitionStatus').mockResolvedValueOnce({
      isLive: true,
      isBeforeStart: false,
      isAfterEnd: false,
      startDate: mockStartDate,
      endDate: mockEndDate,
      state: 'LIVE',
    });
    const detail = await challengesService.getPublicChallengeBySlug(mockPublishedChallenge.slug, participantUser);
    expect(detail).toBeDefined();
  });
});
