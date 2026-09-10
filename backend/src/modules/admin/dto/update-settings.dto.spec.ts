import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateSettingsDto } from './update-settings.dto';

describe('UpdateSettingsDto Validation Tests', () => {
  const validPayload = {
    ctf_name: 'Cyber Crew CTF 2026',
    description: 'National cyber defense drill.',
    start_date: '2026-09-10T09:00:00Z',
    end_date: '2026-09-15T17:00:00Z',
    timezone: 'UTC',
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
  };

  it('should pass validation with valid ISO-8601 UTC date strings', async () => {
    const dto = plainToInstance(UpdateSettingsDto, validPayload);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when start_date is not a valid ISO-8601 string', async () => {
    const dto = plainToInstance(UpdateSettingsDto, {
      ...validPayload,
      start_date: 'invalid-date-string',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const dateError = errors.find((e) => e.property === 'start_date');
    expect(dateError).toBeDefined();
  });

  it('should fail validation when state is an invalid enum value', async () => {
    const dto = plainToInstance(UpdateSettingsDto, {
      ...validPayload,
      state: 'INVALID_STATE' as any,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const stateError = errors.find((e) => e.property === 'state');
    expect(stateError).toBeDefined();
  });

  it('should fail validation when max_team_size is out of bounds', async () => {
    const dto = plainToInstance(UpdateSettingsDto, {
      ...validPayload,
      max_team_size: 100,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const teamSizeError = errors.find((e) => e.property === 'max_team_size');
    expect(teamSizeError).toBeDefined();
  });
});
