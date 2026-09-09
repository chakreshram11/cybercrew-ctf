import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Team, ScoreEvent, Solve } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  Crown,
  Users,
  Copy,
  RefreshCw,
  CheckCircle2,
  Terminal,
  Activity
} from 'lucide-react';
import { formatPoints, formatDate } from '../../lib/utils';

export const TeamDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, team: myTeam, isTeamCaptain, refreshProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);

  const {
    data: teamData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['team', slug],
    queryFn: async () => {
      const res = await api.get<Team>(`/teams/${slug}`);
      return res.success && res.data ? res.data : null;
    },
  });

  const { data: scoreHistory } = useQuery({
    queryKey: ['team-score-history', slug],
    queryFn: async () => {
      const res = await api.get<ScoreEvent[]>(`/teams/${slug}/score-history`);
      return res.success && res.data ? res.data : [];
    },
  });

  const { data: teamSolves } = useQuery({
    queryKey: ['team-solves', slug],
    queryFn: async () => {
      const res = await api.get<Solve[]>(`/teams/${slug}/solves`);
      return res.success && res.data ? res.data : [];
    },
  });

  const team = teamData;
  const isMyTeamPage = myTeam && team && myTeam.id === team.id;

  // Robust check for management permissions:
  // 1. User is the explicit captain of this team
  // 2. User is a Super Admin
  // 3. User is marked as Team Captain in their session and this is their team
  const canManageTeam = (user && team && team.captain_id === user.id) ||
                        (user?.role === 'SUPER_ADMIN') ||
                        (isMyTeamPage && isTeamCaptain);

  const {
    data: inviteCodeData,
    refetch: refetchInviteCode,
  } = useQuery({
    queryKey: ['team-invite-code', slug],
    queryFn: async () => {
      const res = await api.get<{ invite_code: string }>(`/teams/${slug}/invite-code`);
      return res.success && res.data ? res.data.invite_code : null;
    },
    enabled: !!canManageTeam && !!slug,
  });

  const inviteCode = inviteCodeData;

  const handleCopyInvite = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (!team) return;
    setRegenLoading(true);
    try {
      const res = await api.post<{ invite_code: string }>(`/teams/${team.id}/regenerate-code`);
      if (res.success) {
        await refetchInviteCode();
        await refetch();
        await refreshProfile();
      }
    } finally {
      setRegenLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center font-mono text-cyan-400 text-sm flex items-center justify-center gap-2">
        <Terminal className="w-5 h-5 animate-spin" />
        <span>FETCHING SQUAD DOSSIER...</span>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="py-20 text-center rounded-xl bg-[#090e1c] border border-slate-800 font-mono">
        <h2 className="text-lg font-bold text-slate-200">TEAM NOT FOUND</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">No squad registered under this identifier.</p>
        <Link to="/teams" className="text-xs text-cyan-400 hover:underline">
          Return to Teams Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Team Header Banner */}
      <div className="p-8 rounded-2xl bg-[#090e1c] border border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#070b14] rounded-[10px] flex items-center justify-center font-mono font-bold text-2xl text-cyan-400">
                {team.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wide">
                  {team.name}
                </h1>
                {team.rank && (
                  <span className="px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
                    RANK #{team.rank}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <span>ESTABLISHED: {formatDate(team.created_at)}</span>
                <span>•</span>
                <span>{team.members?.length || 1} OPERATIVES</span>
              </p>
            </div>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-4 font-mono">
            <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 block uppercase">Total Score</span>
              <span className="text-xl font-bold text-cyan-400">{formatPoints(team.score)}</span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 block uppercase">Solves</span>
              <span className="text-xl font-bold text-emerald-400">{team.solves_count || 0}</span>
            </div>
          </div>
        </div>

        {/* Invite Code Manager for Captains */}
        {canManageTeam && (
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-slate-400">INVITATION CODE:</span>
              {inviteCode ? (
                <>
                  <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-400 tracking-widest font-bold">
                    {inviteCode}
                  </span>
                  <button
                    onClick={handleCopyInvite}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Copy code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {copied && <span className="text-emerald-400 text-[11px]">COPIED!</span>}
                </>
              ) : (
                <span className="text-rose-400 italic">No code generated</span>
              )}
            </div>

            <button
              onClick={handleRegenerateCode}
              disabled={regenLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenLoading ? 'animate-spin' : ''}`} />
              <span>{inviteCode ? 'REGENERATE CODE' : 'GENERATE CODE'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Roster Section */}
        <div className="space-y-4">
          <h2 className="text-base font-mono font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            OPERATIVE ROSTER
          </h2>

          <div className="rounded-xl border border-slate-800 bg-[#090e1c] divide-y divide-slate-800/60 font-mono text-xs">
            {team.members && team.members.length > 0 ? (
              team.members.map((member) => (
                <div key={member.id} className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                      {member.user?.username.charAt(0).toUpperCase() || 'O'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-200 block">
                        {member.user?.username}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Joined {formatDate(member.joined_at)}
                      </span>
                    </div>
                  </div>

                  {member.role === 'CAPTAIN' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                      <Crown className="w-3 h-3" />
                      CAPTAIN
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">MEMBER</span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500">No member records located.</div>
            )}
          </div>
        </div>

        {/* Solved Challenges & Score Ledger */}
        <div className="lg:col-span-2 space-y-6">
          {/* Solves List */}
          <div className="space-y-3">
            <h2 className="text-base font-mono font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              SOLVED CHALLENGES ({teamSolves?.length || 0})
            </h2>

            <div className="rounded-xl border border-slate-800 bg-[#090e1c] overflow-hidden">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0a1020] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Challenge</th>
                    <th className="px-4 py-3">Solved At</th>
                    <th className="px-4 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {!teamSolves || teamSolves.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        No challenges solved yet.
                      </td>
                    </tr>
                  ) : (
                    teamSolves.map((solve) => (
                      <tr key={solve.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-semibold text-slate-200">
                          {solve.challenge?.name || 'Encrypted Challenge'}
                          {solve.is_first_blood && (
                            <span className="ml-2 text-rose-400 text-[10px] font-bold">
                              🩸 FIRST BLOOD
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{formatDate(solve.solved_at)}</td>
                        <td className="px-4 py-3 text-right font-bold text-cyan-400">
                          +{solve.points_awarded} PTS
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Immutable Score Events Ledger */}
          <div className="space-y-3">
            <h2 className="text-base font-mono font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              SCORE TRANSACTION LEDGER
            </h2>

            <div className="rounded-xl border border-slate-800 bg-[#090e1c] overflow-hidden">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0a1020] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3 text-right">Points Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {!scoreHistory || scoreHistory.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        No score transactions recorded.
                      </td>
                    </tr>
                  ) : (
                    scoreHistory.map((item) => {
                      const isPositive = item.points >= 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-slate-300">
                            <span className="font-semibold text-white block">
                              {item.description}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                              {item.event_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{formatDate(item.created_at)}</td>
                          <td
                            className={`px-4 py-3 text-right font-bold ${
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isPositive ? `+${item.points}` : item.points} PTS
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
