import { Test, TestingModule } from '@nestjs/testing';
import { ScoringService } from './scoring.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScoringService>(ScoringService);
  });

  describe('Static Scoring', () => {
    it('should return basePoints unchanged when dynamic scoring is disabled', () => {
      const points = service.computePoints(500, 100, 1, false);
      expect(points).toBe(500);

      const pointsAfterTenSolves = service.computePoints(500, 100, 10, false);
      expect(pointsAfterTenSolves).toBe(500);
    });
  });

  describe('Dynamic Scoring Decay', () => {
    it('should return basePoints on the first solve', () => {
      const points = service.computePoints(500, 100, 1, true);
      expect(points).toBe(500);
    });

    it('should decay points as solve count increases', () => {
      const solve1 = service.computePoints(500, 100, 1, true);
      const solve5 = service.computePoints(500, 100, 5, true);
      const solve15 = service.computePoints(500, 100, 15, true);
      const solve30 = service.computePoints(500, 100, 30, true);

      expect(solve1).toBe(500);
      expect(solve5).toBeLessThan(solve1);
      expect(solve15).toBeLessThan(solve5);
      expect(solve30).toBeLessThanOrEqual(solve15);
      expect(solve30).toBe(100); // Clamped at minimumPoints
    });

    it('should never decay below minimumPoints', () => {
      const points = service.computePoints(500, 100, 100, true);
      expect(points).toBe(100);
    });
  });
});
