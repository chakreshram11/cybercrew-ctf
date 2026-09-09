import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthSyncDto } from './dto/auth-sync.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Authenticates operative credentials through Supabase Auth,
   * enforces account activity status, updates last_login_at,
   * and returns session tokens with verified operative profile and role.
   */
  async login(dto: LoginDto) {
    const client = this.supabaseService.getClient();
    const authClient = this.supabaseService.createAuthClient();

    const email = dto.email.trim().toLowerCase();
    const password = dto.password;

    // Authenticate with isolated Supabase Auth client to preserve service role on main client
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      const msg = error?.message?.toLowerCase() || '';
      this.logger.warn(`Failed login attempt for [${email}]: ${error?.message}`);

      if (msg.includes('email not confirmed') || msg.includes('not verified')) {
        throw new UnauthorizedException({
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address before logging in.',
        });
      }

      if (error?.status === 429 || msg.includes('too many') || msg.includes('rate limit')) {
        throw new HttpException(
          {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please wait a few moments before trying again.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Generic authentication failure: never disclose whether email exists
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    // Resolve operative profile in public.users
    let profile = await this.supabaseService.getUserProfile(data.user.id);

    // Auto-provision or update if profile missing
    if (!profile) {
      const username =
        data.user.user_metadata?.username ||
        email.split('@')[0] ||
        `agent_${data.user.id.slice(0, 8)}`;
      const role = (data.user.user_metadata?.role as any) || 'PARTICIPANT';

      const { data: newProfile } = await client
        .from('users')
        .insert({
          id: data.user.id,
          auth_id: data.user.id,
          username,
          display_name: data.user.user_metadata?.display_name || username,
          email,
          role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      profile = newProfile;
    } else {
      // Check if operative account has been suspended by administration
      if (profile.is_active === false) {
        throw new UnauthorizedException({
          code: 'ACCOUNT_SUSPENDED',
          message: 'This operative account has been suspended by administration.',
        });
      }

      // Update last login timestamp
      await client
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
    }

    this.logger.log(
      `Operative authenticated: ${profile?.username || email} [${profile?.role || 'PARTICIPANT'}]`,
    );

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      user: {
        id: profile?.id || data.user.id,
        email: profile?.email || email,
        username: profile?.username || email.split('@')[0],
        display_name: profile?.display_name || profile?.username || email.split('@')[0],
        role: profile?.role || 'PARTICIPANT',
        team_id: profile?.team_id || null,
        is_active: profile?.is_active ?? true,
      },
    };
  }

  /**
   * Registers a new operative directly via Supabase Auth Admin API with pre-confirmed email.
   * Eliminates SMTP configuration barriers during CTFs and guarantees immediate login capability.
   */
  async registerUser(dto: RegisterUserDto) {
    const client = this.supabaseService.getClient();

    // Check if username is taken
    const { data: usernameConflict } = await client
      .from('users')
      .select('id')
      .ilike('username', dto.username)
      .maybeSingle();

    if (usernameConflict) {
      throw new ConflictException('Callsign / username is already registered to another operative.');
    }

    // Check if email is already registered in public.users
    const { data: emailConflict } = await client
      .from('users')
      .select('id')
      .ilike('email', dto.email)
      .maybeSingle();

    if (emailConflict) {
      throw new ConflictException('Email address is already registered.');
    }

    // Create user in Supabase Auth with pre-confirmed email
    let authUser: any = null;
    const { data: authData, error: authError } = await client.auth.admin.createUser({
      email: dto.email.trim().toLowerCase(),
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        username: dto.username.trim(),
        display_name: dto.username.trim(),
        role: 'PARTICIPANT',
      },
    });

    if (authError || !authData.user) {
      const msg = authError?.message?.toLowerCase() || '';
      this.logger.error(`Supabase Auth creation failed for [${dto.email}]: ${authError?.message} (msg: ${msg})`);

      if (
        msg.includes('already been registered') ||
        msg.includes('already exists') ||
        msg.includes('user already exists') ||
        msg.includes('already registered')
      ) {
        this.logger.log(`Attempting to reclaim orphaned auth account for [${dto.email}]`);

        let existing: any = null;
        let page = 1;
        const MAX_PAGES = 100;

        while (!existing && page <= MAX_PAGES) {
          this.logger.log(`Searching for orphaned account on page ${page}...`);
          const { data: listData, error: listError } = await client.auth.admin.listUsers({
            page: page,
          });

          if (listError) {
            this.logger.error(`Failed to list users on page ${page}: ${listError.message}`);
            break;
          }

          existing = listData?.users?.find(
            (u: any) => u.email?.toLowerCase() === dto.email.trim().toLowerCase(),
          );

          if (!existing && (!listData?.users || listData.users.length === 0)) {
            break; // No more users to search
          }

          page++;
        }

        if (existing) {
          this.logger.log(`Found orphaned account [${existing.id}] on page ${page - 1}, updating credentials...`);
          await client.auth.admin.updateUserById(existing.id, {
            password: dto.password,
            email_confirm: true,
            user_metadata: {
              username: dto.username.trim(),
              display_name: dto.username.trim(),
              role: 'PARTICIPANT',
            },
          });
          authUser = existing;
        } else {
          this.logger.warn(`No matching auth user found in list for [${dto.email}] after ${page - 1} pages despite error message.`);
          throw new BadRequestException('Account conflict detected but recovery failed. Please contact administration.');
        }
      } else {
        this.logger.error(`Non-recoverable Supabase Auth error: ${authError?.message}`);
        throw new BadRequestException(authError?.message || 'Failed to initialize operative account.');
      }
    } else {
      authUser = authData.user;
    }

    // Insert into public.users
    const { data: newUser, error: insertError } = await client
      .from('users')
      .insert({
        id: authUser.id,
        auth_id: authUser.id,
        username: dto.username.trim(),
        display_name: dto.username.trim(),
        email: dto.email.trim().toLowerCase(),
        role: 'PARTICIPANT',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !newUser) {
      this.logger.error(`Database insertion failed: ${insertError?.message}`);
      await client.auth.admin.deleteUser(authUser.id);
      throw new InternalServerErrorException(
        `Failed to create operative database record: ${insertError?.message || 'Unknown error'}`,
      );
    }

    this.logger.log(`Operative registered: ${newUser.username} [${newUser.id}]`);
    return {
      success: true,
      message: 'Registration successful. Operative account active.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    };
  }

  /**
   * Synchronizes Supabase Auth user record with the local users profile table.
   * Ensures callsign uniqueness and default PARTICIPANT role assignment.
   */
  async syncUser(authId: string, dto: AuthSyncDto) {
    const client = this.supabaseService.getClient();

    // Check if user already exists with this auth_id
    const { data: existingUser, error: fetchError } = await client
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .maybeSingle();

    if (existingUser) {
      // Update last login
      await client
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id);

      return existingUser;
    }

    // Check if username is already taken by another operative
    const { data: usernameConflict } = await client
      .from('users')
      .select('id')
      .ilike('username', dto.username)
      .maybeSingle();

    if (usernameConflict) {
      throw new ConflictException(
        'Callsign / username is already registered to another operative.',
      );
    }

    // Insert new operative profile
    const { data: newUser, error: insertError } = await client
      .from('users')
      .insert({
        auth_id: authId,
        username: dto.username,
        display_name: dto.username,
        email: dto.email,
        role: 'PARTICIPANT',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !newUser) {
      this.logger.error(`Failed to synchronize user: ${insertError?.message}`);
      throw new InternalServerErrorException(
        'Failed to initialize operative profile.',
      );
    }

    this.logger.log(`New operative enlisted: ${newUser.username} [${newUser.id}]`);
    return newUser;
  }
}
