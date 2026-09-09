import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Team } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Shield, Plus, KeyRound, Search, Terminal, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPoints } from '../../lib/utils';

export const TeamsPage: React.FC = () => {
  const { user, team: myTeam, refreshProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Form states
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: teamsData, isLoading, refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await api.get<Team[]>('/teams');
      return res.success && res.data ? res.data : [];
    },
  });

  const teams = teamsData || [];
  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setActionError(null);
    setActionLoading(true);

    try {
      const res = await api.post<Team>('/teams', { name: teamName.trim() });
      if (res.success && res.data) {
        setShowCreateModal(false);
        setTeamName('');
        await refreshProfile();
        refetch();
      } else {
        setActionError(res.error?.message || 'Failed to create team.');
      }
    } catch {
      setActionError('Network connection error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setActionError(null);
    setActionLoading(true);

    try {
      const res = await api.post<Team>('/teams/join', { invite_code: inviteCode.trim() });
      if (res.success && res.data) {
        setShowJoinModal(false);
        setInviteCode('');
        await refreshProfile();
        refetch();
      } else {
        setActionError(res.error?.message || 'Invalid or expired invitation code.');
      }
    } catch {
      setActionError('Network connection error.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-mono font-bold text-white tracking-wide">TEAM SQUADRON</h1>
          </div>
          <p className="text-xs font-mono text-slate-400">
            COLLABORATE IN SQUADS • POOL COLLECTIVE POINTS • CLIMB THE SCOREBOARD
          </p>
        </div>

        {/* User Team Actions */}
        <div className="flex items-center gap-3">
          {myTeam ? (
            <Link
              to={`/teams/${myTeam.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold hover:bg-cyan-500/20 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>MY TEAM: [{myTeam.name}]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActionError(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-mono text-xs font-bold shadow-md shadow-cyan-500/20 hover:scale-[1.02] transition-all"
              >
                <Plus className="w-4 h-4" />
                CREATE TEAM
              </button>
              <button
                onClick={() => {
                  setActionError(null);
                  setShowJoinModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-mono text-xs font-semibold hover:border-slate-500 transition-colors"
              >
                <KeyRound className="w-4 h-4 text-cyan-400" />
                JOIN VIA CODE
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-400 text-slate-950 font-mono text-xs font-bold"
            >
              LOGIN TO JOIN OR CREATE TEAM
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search registered teams..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
        />
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="py-20 text-center font-mono text-cyan-400 text-sm flex items-center justify-center gap-2">
          <Terminal className="w-5 h-5 animate-spin" />
          <span>ROSTERING COMPETITION TEAMS...</span>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="py-16 text-center border border-slate-800 rounded-xl bg-[#090e1c] text-slate-500 font-mono text-xs">
          No teams found matching search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((t) => (
            <div
              key={t.id}
              className={`p-5 rounded-xl border bg-[#090e1c] flex flex-col justify-between transition-all ${
                myTeam?.id === t.id
                  ? 'border-cyan-500/60 bg-cyan-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  {t.rank && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs font-semibold">
                      Rank #{t.rank}
                    </span>
                  )}
                </div>

                <Link
                  to={`/teams/${t.slug}`}
                  className="text-base font-mono font-bold text-white hover:text-cyan-400 transition-colors block mb-1"
                >
                  {t.name}
                </Link>

                <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mb-4">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t.members?.length || 1} Operative(s)</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">{t.solves_count || 0} Solves</span>
                <span className="font-bold text-cyan-400 text-sm">
                  {formatPoints(t.score)} PTS
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#090e1c] border border-slate-700 rounded-2xl p-6 shadow-2xl font-mono text-xs">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              CREATE OPERATIVE TEAM
            </h3>
            <p className="text-slate-400 mb-5">
              You will become the Team Captain and can invite other operatives via code.
            </p>

            {actionError && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-slate-300 uppercase mb-1.5">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. CyberVanguard"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-lg bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 disabled:opacity-50"
                >
                  {actionLoading ? 'CREATING...' : 'ESTABLISH SQUAD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#090e1c] border border-slate-700 rounded-2xl p-6 shadow-2xl font-mono text-xs">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-cyan-400" />
              JOIN TEAM VIA CODE
            </h3>
            <p className="text-slate-400 mb-5">
              Enter the unique 8-character invitation code provided by your Team Captain.
            </p>

            {actionError && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
                {actionError}
              </div>
            )}

            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label className="block text-slate-300 uppercase mb-1.5">Invitation Code</label>
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. C7B8-9F2A"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm tracking-widest focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-lg bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 disabled:opacity-50"
                >
                  {actionLoading ? 'JOINING...' : 'CONFIRM ENLISTMENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
