import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { User, Team, UserRole } from '../types';

interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: User;
}

interface AuthContextType {
  supabaseUser: SupabaseUser | null;
  user: User | null;
  team: Team | null;
  session: Session | null;
  isLoading: boolean;
  role: UserRole;
  isAdmin: boolean;
  isAuthor: boolean;
  isTeamCaptain: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signUp: (email: string, pass: string, username: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (sUser?: SupabaseUser | null) => {
    const activeSUser = sUser !== undefined ? sUser : supabaseUser;
    if (!activeSUser) {
      setUser(null);
      setTeam(null);
      return;
    }

    try {
      const res = await api.get<User>('/users/me');
      if (res.success && res.data) {
        setUser(res.data);
        if (res.data.team_id) {
          const teamRes = await api.get<Team>(`/teams/${res.data.team_id}`);
          if (teamRes.success && teamRes.data) {
            setTeam(teamRes.data);
          } else {
            setTeam(null);
          }
        } else {
          setTeam(null);
        }
      } else {
        // Fallback user state from Supabase auth metadata if backend profile not yet ready
        setUser({
          id: activeSUser.id,
          username: activeSUser.user_metadata?.username || activeSUser.email?.split('@')[0] || 'Agent',
          display_name: activeSUser.user_metadata?.display_name || activeSUser.email?.split('@')[0] || 'Agent',
          email: activeSUser.email || '',
          role: (activeSUser.user_metadata?.role as UserRole) || 'PARTICIPANT',
          is_active: true,
          created_at: activeSUser.created_at,
          updated_at: activeSUser.created_at,
        });
      }
    } catch {
      // Offline / fallback
    }
  };

  useEffect(() => {
    // Initial session retrieval
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setTeam(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (
    email: string,
    pass: string,
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return { success: false, error: 'Email address is required.' };
    }
    if (!pass) {
      return { success: false, error: 'Password is required.' };
    }

    try {
      // Authenticate server-side via NestJS API endpoint
      const res = await api.post<LoginResponseData>('/auth/login', {
        email: trimmedEmail,
        password: pass,
      });

      if (!res.success || !res.data) {
        const code = res.error?.code || '';
        let errorMessage = 'Invalid email or password.';

        if (code === 'EMAIL_NOT_VERIFIED') {
          errorMessage =
            'Your email address has not been verified. Please verify your email before logging in.';
        } else if (code === 'RATE_LIMITED') {
          errorMessage =
            'Too many login attempts. Please wait a few moments before trying again.';
        } else if (code === 'ACCOUNT_SUSPENDED') {
          errorMessage =
            'This operative account has been suspended by administration.';
        } else if (
          code === 'VALIDATION_FAILED' ||
          code === 'VALIDATION_ERROR'
        ) {
          errorMessage = 'Please enter a valid email address and password.';
        } else if (res.error?.message) {
          errorMessage = res.error.message;
        }

        return { success: false, error: errorMessage };
      }

      // Sync session into browser Supabase SDK for realtime WebSockets & storage
      try {
        await supabase.auth.setSession({
          access_token: res.data.access_token,
          refresh_token: res.data.refresh_token,
        });
      } catch {
        // Safe fallback
      }

      setUser(res.data.user);
      if (res.data.user.team_id) {
        const teamRes = await api.get<Team>(
          `/teams/${res.data.user.team_id}`,
        );
        if (teamRes.success && teamRes.data) {
          setTeam(teamRes.data);
        } else {
          setTeam(null);
        }
      } else {
        setTeam(null);
      }

      return { success: true, user: res.data.user };
    } catch (err: any) {
      return {
        success: false,
        error:
          err.message || 'Unable to connect to authentication service.',
      };
    }
  };

  const signUp = async (email: string, pass: string, username: string) => {
    try {
      // 1. Register through backend to pre-confirm email and populate public.users
      const res = await api.post('/auth/register', {
        email,
        password: pass,
        username,
      });

      if (!res.success) {
        return {
          success: false,
          error: res.error?.message || 'Registration failed.',
        };
      }

      // 2. Immediately authenticate with password
      const loginRes = await signIn(email, pass);
      if (!loginRes.success) {
        return {
          success: true, // Account created, user can log in manually
        };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTeam(null);
    setSupabaseUser(null);
    setSession(null);
  };

  const role: UserRole = user?.role || 'PARTICIPANT';
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isAuthor = isAdmin || role === 'CHALLENGE_AUTHOR';
  const isTeamCaptain = role === 'TEAM_CAPTAIN' || (team?.captain_id === user?.id);

  return (
    <AuthContext.Provider
      value={{
        supabaseUser,
        user,
        team,
        session,
        isLoading,
        role,
        isAdmin,
        isAuthor,
        isTeamCaptain,
        signIn,
        signUp,
        signOut,
        refreshProfile: () => fetchUserProfile(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
