import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;
  private salt: string;
  private url: string;
  private anonKey: string;
  private serviceRoleKey: string;

  constructor(private configService: ConfigService) {
    this.salt =
      this.configService.get<string>('security.flagSecretSalt') ||
      'cybercrew-default-salt-value-for-dev-32chars';
  }

  onModuleInit() {
    this.url =
      this.configService.get<string>('supabase.url') ||
      'https://placeholder.supabase.co';
    this.anonKey =
      this.configService.get<string>('supabase.anonKey') ||
      'placeholder-anon-key';
    this.serviceRoleKey =
      this.configService.get<string>('supabase.serviceRoleKey') ||
      'placeholder-service-role-key';

    if (!this.url || !this.serviceRoleKey) {
      this.logger.warn(
        'Supabase URL or Service Role Key missing in environment! Operating in fallback mode.',
      );
    }

    this.client = createClient(this.url, this.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    this.logger.log('Supabase Administrative Client initialized.');
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Creates an isolated, ephemeral Supabase client with the public anon key
   * strictly for user password verification.
   * Ensures the administrative service-role client is NEVER mutated with a participant session.
   */
  createAuthClient(): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /**
   * Cryptographically secure HMAC-SHA256 flag hashing.
   * Produces a blind hash that prevents flag reverse-engineering if database is exposed.
   */
  hashFlag(flag: string): string {
    return crypto
      .createHmac('sha256', this.salt)
      .update(flag.trim())
      .digest('hex');
  }

  /**
   * Timing-safe verification to prevent side-channel timing attacks on flags.
   */
  verifyFlag(submittedFlag: string, storedHash: string): boolean {
    const submittedHash = this.hashFlag(submittedFlag);
    const bufA = Buffer.from(submittedHash, 'utf8');
    const bufB = Buffer.from(storedHash, 'utf8');

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * One-way cryptographic hash of IP addresses for anti-cheat audit logs.
   */
  hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip || '').digest('hex');
  }

  /**
   * Generates a cryptographically random invite code for teams.
   */
  generateInviteCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Fetches user profile along with current team membership.
   * Matches against both primary id and Supabase auth_id.
   */
  async getUserProfile(userId: string): Promise<any | null> {
    try {
      const { data: user, error: userError } = await this.client
        .from('users')
        .select('*')
        .or(`id.eq.${userId},auth_id.eq.${userId}`)
        .maybeSingle();

      if (userError || !user) {
        return null;
      }

      // Check team membership using the resolved user primary id
      const { data: membership } = await this.client
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      return {
        ...user,
        team_id: membership ? membership.team_id : null,
        team_role: membership ? membership.role : null,
      };
    } catch {
      return null;
    }
  }
}
