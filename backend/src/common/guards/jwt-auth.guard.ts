import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../../modules/supabase/supabase.service';

interface CachedSession {
  user: any;
  expiresAt: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private static readonly sessionCache = new Map<string, CachedSession>();
  private static readonly CACHE_TTL_MS = 10000; // 10 seconds

  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header.');
    }

    const token = authHeader.split(' ')[1];
    const now = Date.now();

    // Check in-memory session cache to avoid redundant WAN round-trips to Supabase
    const cached = JwtAuthGuard.sessionCache.get(token);
    if (cached && now < cached.expiresAt) {
      request.user = cached.user;
      return true;
    }

    try {
      // Authenticate via Supabase Auth
      const {
        data: { user: authUser },
        error,
      } = await this.supabaseService.getClient().auth.getUser(token);

      if (error || !authUser) {
        throw new UnauthorizedException('Invalid or expired authentication session.');
      }

      // Fetch user profile from database to get live role & team state
      let userProfile = await this.supabaseService.getUserProfile(authUser.id);

      if (!userProfile) {
        // Auto-provision user into public.users if authenticated through Supabase Auth
        const username =
          authUser.user_metadata?.username ||
          authUser.email?.split('@')[0] ||
          `agent_${authUser.id.slice(0, 8)}`;
        const role = authUser.user_metadata?.role || 'PARTICIPANT';

        const { data: newUser } = await this.supabaseService
          .getClient()
          .from('users')
          .insert({
            auth_id: authUser.id,
            username,
            display_name: authUser.user_metadata?.display_name || username,
            email: authUser.email || `${username}@cybercrew.online`,
            role,
            is_active: true,
          })
          .select()
          .maybeSingle();

        if (newUser) {
          userProfile = newUser;
        }
      }

      if (!userProfile) {
        // Ultimate fallback
        request.user = {
          id: authUser.id,
          email: authUser.email,
          username:
            authUser.user_metadata?.username ||
            authUser.email?.split('@')[0] ||
            'Operative',
          role: authUser.user_metadata?.role || 'PARTICIPANT',
          is_active: true,
          team_id: null,
        };
      } else {
        if (userProfile.is_active === false) {
          throw new UnauthorizedException('Operative account has been suspended by administration.');
        }

        const userPayload = {
          id: userProfile.id,
          auth_id: userProfile.auth_id || authUser.id,
          email: userProfile.email,
          username: userProfile.username,
          role: userProfile.role,
          is_active: userProfile.is_active,
          team_id: userProfile.team_id,
        };

        request.user = userPayload;

        // Cache session (if user has no team, cache for only 1s so newly created/joined teams resolve immediately)
        const cacheTtl = userPayload.team_id ? JwtAuthGuard.CACHE_TTL_MS : 1000;
        JwtAuthGuard.sessionCache.set(token, {
          user: userPayload,
          expiresAt: now + cacheTtl,
        });

        // Prune stale cache entries if map grows
        if (JwtAuthGuard.sessionCache.size > 1000) {
          for (const [k, v] of JwtAuthGuard.sessionCache.entries()) {
            if (v.expiresAt <= now) JwtAuthGuard.sessionCache.delete(k);
          }
        }
      }

      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Security validation failed: ' + err.message);
    }
  }

  static clearCache() {
    JwtAuthGuard.sessionCache.clear();
  }
}
