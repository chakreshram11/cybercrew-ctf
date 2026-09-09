import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('AuthService - Login & Error Classification', () => {
  let service: AuthService;
  let mockSupabaseClient: any;
  let mockSupabaseService: any;

  beforeEach(async () => {
    mockSupabaseClient = {
      auth: {
        signInWithPassword: jest.fn(),
        admin: {
          createUser: jest.fn(),
          deleteUser: jest.fn(),
        },
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
    };

    mockSupabaseService = {
      getClient: jest.fn().mockReturnValue(mockSupabaseClient),
      createAuthClient: jest.fn().mockReturnValue(mockSupabaseClient),
      getUserProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('Successful Login', () => {
    it('should authenticate successfully and return session tokens with user profile', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
          },
          user: {
            id: 'user-uuid-1',
            email: 'operative@cybercrew.online',
            user_metadata: { username: 'operative1' },
          },
        },
        error: null,
      });

      mockSupabaseService.getUserProfile.mockResolvedValue({
        id: 'user-uuid-1',
        auth_id: 'user-uuid-1',
        username: 'operative1',
        display_name: 'Operative One',
        email: 'operative@cybercrew.online',
        role: 'PARTICIPANT',
        team_id: 'team-uuid-1',
        is_active: true,
      });

      const result = await service.login({
        email: 'operative@cybercrew.online',
        password: 'ValidPassword123!',
      });

      expect(result.access_token).toBe('mock-access-token');
      expect(result.user.username).toBe('operative1');
      expect(result.user.role).toBe('PARTICIPANT');
      expect(result.user.team_id).toBe('team-uuid-1');
    });
  });

  describe('Authentication Error Classification', () => {
    it('should throw UnauthorizedException with INVALID_CREDENTIALS for invalid password', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: {
          status: 400,
          name: 'AuthApiError',
          message: 'Invalid login credentials',
        },
      });

      try {
        await service.login({
          email: 'operative@cybercrew.online',
          password: 'WrongPassword!',
        });
        fail('Expected exception to be thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        const response = err.getResponse();
        expect(response.code).toBe('INVALID_CREDENTIALS');
        expect(response.message).toBe('Invalid email or password.');
      }
    });

    it('should throw UnauthorizedException with INVALID_CREDENTIALS for non-existent email (no email existence leakage)', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: {
          status: 400,
          name: 'AuthApiError',
          message: 'Invalid login credentials',
        },
      });

      try {
        await service.login({
          email: 'nonexistent@cybercrew.online',
          password: 'AnyPassword123!',
        });
        fail('Expected exception to be thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        const response = err.getResponse();
        expect(response.code).toBe('INVALID_CREDENTIALS');
        // Must never leak whether the user exists
        expect(response.message).toBe('Invalid email or password.');
      }
    });

    it('should throw UnauthorizedException with EMAIL_NOT_VERIFIED when email is unconfirmed', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: {
          status: 400,
          name: 'AuthApiError',
          message: 'Email not confirmed',
        },
      });

      try {
        await service.login({
          email: 'unconfirmed@cybercrew.online',
          password: 'Password123!',
        });
        fail('Expected exception to be thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        const response = err.getResponse();
        expect(response.code).toBe('EMAIL_NOT_VERIFIED');
        expect(response.message).toBe('Please verify your email address before logging in.');
      }
    });

    it('should throw HttpException with RATE_LIMITED and 429 when throttled', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: {
          status: 429,
          name: 'AuthApiError',
          message: 'Too many requests',
        },
      });

      try {
        await service.login({
          email: 'rate_limited@cybercrew.online',
          password: 'Password123!',
        });
        fail('Expected exception to be thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = err.getResponse();
        expect(response.code).toBe('RATE_LIMITED');
      }
    });

    it('should throw UnauthorizedException with ACCOUNT_SUSPENDED when operative is inactive', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            token_type: 'bearer',
          },
          user: { id: 'suspended-user-id', email: 'suspended@cybercrew.online' },
        },
        error: null,
      });

      mockSupabaseService.getUserProfile.mockResolvedValue({
        id: 'suspended-user-id',
        username: 'suspended_agent',
        email: 'suspended@cybercrew.online',
        role: 'PARTICIPANT',
        is_active: false, // Inactive / suspended
      });

      try {
        await service.login({
          email: 'suspended@cybercrew.online',
          password: 'Password123!',
        });
        fail('Expected exception to be thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        const response = err.getResponse();
        expect(response.code).toBe('ACCOUNT_SUSPENDED');
        expect(response.message).toBe('This operative account has been suspended by administration.');
      }
    });
  });
});
