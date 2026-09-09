import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

describe('TeamsService - Authorization & Invitation Code Access', () => {
  let service: TeamsService;
  let mockSupabaseClient: any;
  let mockSupabaseService: any;

  const mockCaptainUser: AuthUser = {
    id: 'captain-uuid-1',
    email: 'captain@cybercrew.online',
    username: 'captain_alpha',
    role: 'TEAM_CAPTAIN',
  };

  const mockAdminUser: AuthUser = {
    id: 'admin-uuid-1',
    email: 'admin@cybercrew.online',
    username: 'admin_user',
    role: 'ADMIN',
  };

  const mockSuperAdminUser: AuthUser = {
    id: 'superadmin-uuid-1',
    email: 'superadmin@cybercrew.online',
    username: 'super_admin_user',
    role: 'SUPER_ADMIN',
  };

  const mockMemberUser: AuthUser = {
    id: 'member-uuid-1',
    email: 'member@cybercrew.online',
    username: 'team_member',
    role: 'PARTICIPANT',
  };

  const mockUnrelatedCaptain: AuthUser = {
    id: 'captain-uuid-2',
    email: 'captain2@cybercrew.online',
    username: 'captain_beta',
    role: 'TEAM_CAPTAIN',
  };

  const mockTeamA = {
    id: 'team-uuid-a',
    name: 'Team Alpha',
    slug: 'team-alpha',
    captain_id: 'captain-uuid-1',
    invite_code: 'SECRET_INVITE_A',
    score: 100,
  };

  beforeEach(async () => {
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
    };

    mockSupabaseService = {
      getClient: jest.fn().mockReturnValue(mockSupabaseClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  describe('getTeamBySlug (Public Endpoint Helper)', () => {
    it('should return public team dossier WITHOUT invite_code for any visitor', async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: {
          id: mockTeamA.id,
          name: mockTeamA.name,
          slug: mockTeamA.slug,
          captain_id: mockTeamA.captain_id,
          score: mockTeamA.score,
          created_at: new Date().toISOString(),
          members: [],
        },
        error: null,
      });

      const result = await service.getTeamBySlug('team-alpha', mockCaptainUser);
      expect(result).toBeDefined();
      expect(result.name).toBe('Team Alpha');
      expect((result as any).invite_code).toBeUndefined();
    });
  });

  describe('getInviteCode (Private Authenticated Endpoint Helper)', () => {
    it('ALLOW: Team Captain can retrieve their team invitation code', async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: mockTeamA,
        error: null,
      });

      const result = await service.getInviteCode('team-alpha', mockCaptainUser);
      expect(result).toEqual({ invite_code: 'SECRET_INVITE_A' });
    });

    it('ALLOW: ADMIN can retrieve team invitation code', async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: mockTeamA,
        error: null,
      });

      const result = await service.getInviteCode('team-alpha', mockAdminUser);
      expect(result).toEqual({ invite_code: 'SECRET_INVITE_A' });
    });

    it('ALLOW: SUPER_ADMIN can retrieve team invitation code', async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: mockTeamA,
        error: null,
      });

      const result = await service.getInviteCode('team-alpha', mockSuperAdminUser);
      expect(result).toEqual({ invite_code: 'SECRET_INVITE_A' });
    });

    it('DENY: Ordinary team member is forbidden from viewing invitation code (403)', async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: mockTeamA,
        error: null,
      });

      await expect(
        service.getInviteCode('team-alpha', mockMemberUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('DENY & IDOR PREVENTED: Captain of Team B cannot view Team A invitation code (403)', async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: mockTeamA,
        error: null,
      });

      await expect(
        service.getInviteCode('team-alpha', mockUnrelatedCaptain),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NOT FOUND: Non-existent team slug returns 404', async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        service.getInviteCode('non-existent-slug', mockCaptainUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
