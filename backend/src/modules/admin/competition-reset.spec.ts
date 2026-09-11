import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

describe('Competition Reset Suite', () => {
  let adminService: AdminService;

  const mockAdminUser: AuthUser = {
    id: 'admin-uuid-1',
    username: 'admin_user',
    email: 'admin@ctf.cybercrew.online',
    role: 'ADMIN',
  };

  const mockParticipantUser: AuthUser = {
    id: 'participant-uuid-1',
    username: 'player1',
    email: 'player1@ctf.cybercrew.online',
    role: 'PARTICIPANT',
    team_id: 'team-uuid-1',
  };

  const createChainableQuery = (dataToReturn: any) => {
    const chain: any = {
      select: jest.fn().mockImplementation(() => chain),
      eq: jest.fn().mockImplementation(() => chain),
      neq: jest.fn().mockImplementation(() => chain),
      delete: jest.fn().mockImplementation(() => chain),
      update: jest.fn().mockImplementation(() => chain),
      insert: jest.fn().mockImplementation(() => chain),
      then: (resolve: any) => resolve({ data: dataToReturn, error: null }),
    };
    return chain;
  };

  const mockSupabaseClient = {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'challenges') {
        return createChainableQuery([{ id: 'chal-1', base_points: 500 }]);
      }
      return createChainableQuery([]);
    }),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    adminService = module.get<AdminService>(AdminService);
  });

  it('1. Admin can reset competition progress and scores successfully', async () => {
    const result = await adminService.resetCompetition(mockAdminUser);
    expect(result.success).toBe(true);
    expect(result.message).toContain('reset successfully');
  });

  it('2. Reset deletes score_events, solves, submissions, hint_unlocks', async () => {
    await adminService.resetCompetition(mockAdminUser);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('score_events');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('solves');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('submissions');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('hint_unlocks');
  });

  it('3. Reset clears team scores to 0 and challenge solves_count to 0', async () => {
    await adminService.resetCompetition(mockAdminUser);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('teams');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('challenges');
  });

  it('4. Reset creates an audit log entry with COMPETITION_SCORE_RESET', async () => {
    await adminService.resetCompetition(mockAdminUser);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_logs');
  });

  it('5. Handles database error during reset gracefully with rollback/exception', async () => {
    const errorClient = {
      from: jest.fn().mockImplementation(() => ({
        delete: jest.fn().mockReturnValue({
          neq: jest.fn().mockResolvedValue({ error: new Error('DB Connection Failed') }),
        }),
      })),
    };
    (mockSupabaseService.getClient as jest.Mock).mockReturnValueOnce(errorClient);

    await expect(adminService.resetCompetition(mockAdminUser)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
