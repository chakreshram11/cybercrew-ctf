import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { CompetitionAccessService } from './competition-access.service';
import { SupabaseService } from '../../modules/supabase/supabase.service';
import { AuthUser } from '../decorators/current-user.decorator';

describe('CompetitionAccessService', () => {
  let service: CompetitionAccessService;

  const mockStartDate = '2026-09-15T11:30:00.000Z'; // 15 Sept 2026 17:00 IST
  const mockEndDate = '2026-09-20T11:30:00.000Z';   // 20 Sept 2026 17:00 IST

  const mockSupabaseClient = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              start_date: mockStartDate,
              end_date: mockEndDate,
              state: 'LIVE',
            },
            error: null,
          }),
        }),
      }),
    }),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

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

  const startMs = new Date(mockStartDate).getTime();
  const endMs = new Date(mockEndDate).getTime();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitionAccessService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<CompetitionAccessService>(CompetitionAccessService);
  });

  describe('isAdmin', () => {
    it('should identify ADMIN, SUPER_ADMIN, CHALLENGE_AUTHOR, and MODERATOR as admin users', () => {
      expect(service.isAdmin({ role: 'ADMIN' } as any)).toBe(true);
      expect(service.isAdmin({ role: 'SUPER_ADMIN' } as any)).toBe(true);
      expect(service.isAdmin({ role: 'CHALLENGE_AUTHOR' } as any)).toBe(true);
      expect(service.isAdmin({ role: 'MODERATOR' } as any)).toBe(true);
    });

    it('should identify PARTICIPANT and unauthenticated user as non-admin', () => {
      expect(service.isAdmin(participantUser)).toBe(false);
      expect(service.isAdmin(undefined)).toBe(false);
    });
  });

  describe('Exact Time Boundary Enforcement', () => {
    it('Boundary Test 1: at start_date - 1 second -> participant DENIED (403)', async () => {
      const beforeStart = new Date(startMs - 1000);
      await expect(
        service.validateParticipantAccess(participantUser, beforeStart),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Boundary Test 2: at exact start_date -> participant ALLOWED', async () => {
      const atStart = new Date(startMs);
      const status = await service.validateParticipantAccess(participantUser, atStart);
      expect(status.isLive).toBe(true);
    });

    it('Boundary Test 3: at end_date - 1 second -> participant ALLOWED', async () => {
      const beforeEnd = new Date(endMs - 1000);
      const status = await service.validateParticipantAccess(participantUser, beforeEnd);
      expect(status.isLive).toBe(true);
    });

    it('Boundary Test 4: at exact end_date -> participant DENIED (403)', async () => {
      const atEnd = new Date(endMs);
      await expect(
        service.validateParticipantAccess(participantUser, atEnd),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Lifecycle Window & Role Authorization', () => {
    it('BEFORE START: Participant is rejected with 403', async () => {
      const beforeStart = new Date(startMs - 3600 * 1000);
      await expect(
        service.validateParticipantAccess(participantUser, beforeStart),
      ).rejects.toThrow('Challenges are not available until the competition starts.');
    });

    it('BEFORE START: Admin is ALLOWED (Bypasses window check)', async () => {
      const beforeStart = new Date(startMs - 3600 * 1000);
      const status = await service.validateParticipantAccess(adminUser, beforeStart);
      expect(status).toBeDefined();
    });

    it('DURING COMPETITION: Participant is ALLOWED', async () => {
      const duringCompetition = new Date(startMs + 3600 * 1000);
      const status = await service.validateParticipantAccess(participantUser, duringCompetition);
      expect(status.isLive).toBe(true);
    });

    it('AFTER END: Participant is rejected with 403', async () => {
      const afterEnd = new Date(endMs + 3600 * 1000);
      await expect(
        service.validateParticipantAccess(participantUser, afterEnd),
      ).rejects.toThrow('The competition has ended and challenge access is closed.');
    });

    it('AFTER END: Admin is ALLOWED (Bypasses window check)', async () => {
      const afterEnd = new Date(endMs + 3600 * 1000);
      const status = await service.validateParticipantAccess(adminUser, afterEnd);
      expect(status).toBeDefined();
    });
  });
});
