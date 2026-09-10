import { Test, TestingModule } from '@nestjs/testing';
import { ScoreboardService } from './scoreboard.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('ScoreboardService - Leaderboard Ranking & Tie-Breaker Logic', () => {
  let service: ScoreboardService;
  let mockSupabaseClient: any;
  let mockSupabaseService: any;

  beforeEach(async () => {
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    mockSupabaseService = {
      getClient: jest.fn().mockReturnValue(mockSupabaseClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreboardService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<ScoreboardService>(ScoreboardService);
  });

  it('TEST 1: No teams in database -> returns empty array', async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'competition_settings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { scoreboard_frozen: false, freeze_time: null },
            error: null,
          }),
        };
      }
      if (table === 'teams') {
        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return mockSupabaseClient;
    });

    const result = await service.getScoreboard();
    expect(result).toEqual([]);
  });

  it('TEST 2: Three teams all at 0 points & 0 solves -> all assigned rank 1 (tied, no false champion)', async () => {
    const mockTeams = [
      { id: 'team-1', name: 'Alpha', slug: 'alpha', score: 0, updated_at: '2026-01-01T00:00:00Z' },
      { id: 'team-2', name: 'Beta', slug: 'beta', score: 0, updated_at: '2026-01-02T00:00:00Z' },
      { id: 'team-3', name: 'Gamma', slug: 'gamma', score: 0, updated_at: '2026-01-03T00:00:00Z' },
    ];

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'competition_settings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { scoreboard_frozen: false, freeze_time: null },
            error: null,
          }),
        };
      }
      if (table === 'teams') {
        return {
          select: jest.fn().mockResolvedValue({ data: mockTeams, error: null }),
        };
      }
      if (table === 'solves') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return mockSupabaseClient;
    });

    const result = await service.getScoreboard();
    expect(result.length).toBe(3);
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(1);
    expect(result[2].rank).toBe(1);
    expect(result.every((t) => t.score === 0 && t.solves_count === 0)).toBe(true);
  });

  it('TEST 3: Team A = 100, others = 0 -> Team A is rank 1, others rank 2', async () => {
    const mockTeams = [
      { id: 'team-1', name: 'Alpha', slug: 'alpha', score: 100, updated_at: '2026-01-01T00:00:00Z' },
      { id: 'team-2', name: 'Beta', slug: 'beta', score: 0, updated_at: '2026-01-02T00:00:00Z' },
      { id: 'team-3', name: 'Gamma', slug: 'gamma', score: 0, updated_at: '2026-01-03T00:00:00Z' },
    ];

    const mockSolves = [
      { team_id: 'team-1', is_first_blood: true, solved_at: '2026-01-01T10:00:00Z' },
    ];

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'competition_settings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { scoreboard_frozen: false, freeze_time: null },
            error: null,
          }),
        };
      }
      if (table === 'teams') {
        return {
          select: jest.fn().mockResolvedValue({ data: mockTeams, error: null }),
        };
      }
      if (table === 'solves') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockSolves, error: null }),
        };
      }
      return mockSupabaseClient;
    });

    const result = await service.getScoreboard();
    expect(result[0].team_id).toBe('team-1');
    expect(result[0].rank).toBe(1);
    expect(result[0].score).toBe(100);
    expect(result[1].rank).toBe(2);
    expect(result[2].rank).toBe(2);
  });

  it('TEST 4: Team A = 500 (1 solve), Team B = 500 (2 solves) -> Team B ranks higher due to solves_count tie-breaker', async () => {
    const mockTeams = [
      { id: 'team-1', name: 'Alpha', slug: 'alpha', score: 500, updated_at: '2026-01-01T00:00:00Z' },
      { id: 'team-2', name: 'Beta', slug: 'beta', score: 500, updated_at: '2026-01-02T00:00:00Z' },
    ];

    const mockSolves = [
      { team_id: 'team-1', is_first_blood: false, solved_at: '2026-01-01T10:00:00Z' },
      { team_id: 'team-2', is_first_blood: false, solved_at: '2026-01-01T11:00:00Z' },
      { team_id: 'team-2', is_first_blood: false, solved_at: '2026-01-01T09:00:00Z' },
    ];

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'competition_settings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { scoreboard_frozen: false, freeze_time: null },
            error: null,
          }),
        };
      }
      if (table === 'teams') {
        return {
          select: jest.fn().mockResolvedValue({ data: mockTeams, error: null }),
        };
      }
      if (table === 'solves') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockSolves, error: null }),
        };
      }
      return mockSupabaseClient;
    });

    const result = await service.getScoreboard();
    expect(result[0].team_id).toBe('team-2');
    expect(result[0].rank).toBe(1);
    expect(result[0].solves_count).toBe(2);

    expect(result[1].team_id).toBe('team-1');
    expect(result[1].rank).toBe(2);
    expect(result[1].solves_count).toBe(1);
  });

  it('TEST 5: Equal score & equal solves -> earlier last_solve_at ranks higher', async () => {
    const mockTeams = [
      { id: 'team-1', name: 'Alpha', slug: 'alpha', score: 500, updated_at: '2026-01-01T00:00:00Z' },
      { id: 'team-2', name: 'Beta', slug: 'beta', score: 500, updated_at: '2026-01-02T00:00:00Z' },
    ];

    const mockSolves = [
      { team_id: 'team-1', is_first_blood: false, solved_at: '2026-01-01T12:00:00Z' },
      { team_id: 'team-2', is_first_blood: false, solved_at: '2026-01-01T09:00:00Z' },
    ];

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'competition_settings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { scoreboard_frozen: false, freeze_time: null },
            error: null,
          }),
        };
      }
      if (table === 'teams') {
        return {
          select: jest.fn().mockResolvedValue({ data: mockTeams, error: null }),
        };
      }
      if (table === 'solves') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockSolves, error: null }),
        };
      }
      return mockSupabaseClient;
    });

    const result = await service.getScoreboard();
    expect(result[0].team_id).toBe('team-2'); // 09:00 AM solve ranks before 12:00 PM solve
    expect(result[0].rank).toBe(1);

    expect(result[1].team_id).toBe('team-1');
    expect(result[1].rank).toBe(2);
  });
});
