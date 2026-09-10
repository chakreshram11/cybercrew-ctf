import { Test, TestingModule } from '@nestjs/testing';
import { PublicSettingsController } from './public-settings.controller';
import { AdminService } from './admin.service';

describe('PublicSettingsController', () => {
  let controller: PublicSettingsController;
  let adminService: jest.Mocked<Partial<AdminService>>;

  const mockSettings = {
    id: 1,
    ctf_name: 'Cyber Crew CTF 2026',
    description: 'National cyber defense drill.',
    start_date: '2026-09-10T03:30:00.000Z',
    end_date: '2026-09-15T11:30:00.000Z',
    timezone: 'Asia/Kolkata',
    state: 'LIVE' as const,
    registration_open: true,
    max_team_size: 4,
    min_team_size: 1,
    allow_negative_scores: false,
    dynamic_scoring_enabled: true,
    first_blood_enabled: true,
    hints_enabled: true,
    scoreboard_frozen: false,
    submission_rate_limit: 10,
    maintenance_mode: false,
  };

  beforeEach(async () => {
    adminService = {
      getCompetitionSettings: jest.fn().mockResolvedValue(mockSettings),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicSettingsController],
      providers: [
        {
          provide: AdminService,
          useValue: adminService,
        },
      ],
    }).compile();

    controller = module.get<PublicSettingsController>(PublicSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return non-sensitive public settings', async () => {
    const result = await controller.getPublicSettings();
    expect(result).toEqual({
      ctf_name: 'Cyber Crew CTF 2026',
      description: 'National cyber defense drill.',
      start_date: '2026-09-10T03:30:00.000Z',
      end_date: '2026-09-15T11:30:00.000Z',
      timezone: 'Asia/Kolkata',
      state: 'LIVE',
      registration_open: true,
      scoreboard_frozen: false,
    });
    expect(result).not.toHaveProperty('submission_rate_limit');
    expect(result).not.toHaveProperty('maintenance_mode');
  });
});
