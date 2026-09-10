import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ScoreboardEntry } from '../../types';
import { Trophy, Flame, Search, Activity, Crown, Medal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPoints, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeScoreboard } from '../../hooks/useRealtimeScoreboard';

export const ScoreboardPage: React.FC = () => {
  useRealtimeScoreboard();
  const { team: myTeam } = useAuth();
  const [search, setSearch] = useState('');

  const { data: scoreboard, isLoading } = useQuery({
    queryKey: ['scoreboard'],
    queryFn: async () => {
      const res = await api.get<ScoreboardEntry[]>('/scoreboard');
      return res.success && res.data ? res.data : [];
    },
    refetchInterval: 15000, // Real-time poll fallback every 15 seconds
  });

  const entries = scoreboard || [];
  const filteredEntries = entries.filter((e) =>
    e.team_name.toLowerCase().includes(search.toLowerCase())
  );

  const hasScoredLeader = entries.some((e) => e.score > 0 || e.solves_count > 0);

  const getRankBadge = (entry: ScoreboardEntry) => {
    if (entry.rank === 1 && hasScoredLeader) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
          <Crown className="w-4 h-4" />
        </span>
      );
    }
    if (entry.rank === 2 && hasScoredLeader) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-300 border border-slate-300/40">
          <Medal className="w-4 h-4" />
        </span>
      );
    }
    if (entry.rank === 3 && hasScoredLeader) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40">
          <Medal className="w-4 h-4" />
        </span>
      );
    }
    return <span className="font-mono text-slate-400 font-semibold text-sm">#{entry.rank}</span>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl font-mono font-bold text-white tracking-wide">LIVE SCOREBOARD</h1>
          </div>
          <p className="text-xs font-mono text-slate-400">
            OFFICIAL REAL-TIME LEADERBOARD • DERIVED FROM IMMUTABLE SCORE LEDGER
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>LIVE SYNC ACTIVE</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams..."
              className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Neutral Zero-Score State (When all teams have 0 PTS / 0 solves) */}
      {!isLoading && entries.length > 0 && !hasScoredLeader && !search && (
        <div className="p-6 rounded-2xl bg-[#090e1c] border border-slate-800 text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-mono font-bold text-white tracking-wide">LEADERBOARD OPEN</h3>
            <p className="text-xs font-mono text-slate-400 mt-1">
              No scored leader yet. Solve challenges to claim top podium positions!
            </p>
          </div>
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 font-mono text-xs text-slate-400">
            <span>{entries.length} SQUADS REGISTERED</span>
            <span>•</span>
            <span>0 PTS TOP SCORE</span>
          </div>
        </div>
      )}

      {/* Top 3 Podium Cards (Rendered only when at least one team has scored) */}
      {!isLoading && entries.length >= 3 && hasScoredLeader && !search && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* 2nd Place */}
          <div className="p-5 rounded-xl bg-[#090e1c] border border-slate-700 flex flex-col items-center text-center relative order-2 md:order-1">
            <div className="w-10 h-10 rounded-full bg-slate-300/10 border border-slate-300/30 flex items-center justify-center text-slate-300 mb-2">
              <Medal className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              {entries[1].rank === entries[0].rank ? '2ND PLACE (TIED 1ST)' : '2ND PLACE'}
            </span>
            <Link
              to={`/teams/${entries[1].team_slug}`}
              className="text-base font-mono font-bold text-white hover:text-cyan-400 mt-1"
            >
              {entries[1].team_name}
            </Link>
            <span className="text-lg font-mono font-bold text-cyan-400 mt-1">
              {formatPoints(entries[1].score)} PTS
            </span>
            <span className="text-xs font-mono text-slate-500 mt-0.5">
              {entries[1].solves_count} solves
            </span>
          </div>

          {/* 1st Place */}
          <div className="p-6 rounded-2xl bg-[#0d1428] border-2 border-amber-500/50 shadow-xl shadow-amber-500/10 flex flex-col items-center text-center relative order-1 md:order-2 scale-105">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2">
              <Crown className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold">
              {entries[0].rank === entries[1].rank ? '👑 1ST PLACE (TIED)' : '👑 1ST PLACE CHAMPION'}
            </span>
            <Link
              to={`/teams/${entries[0].team_slug}`}
              className="text-lg font-mono font-bold text-white hover:text-cyan-400 mt-1"
            >
              {entries[0].team_name}
            </Link>
            <span className="text-2xl font-mono font-black text-amber-400 mt-1">
              {formatPoints(entries[0].score)} PTS
            </span>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-1">
              <span>{entries[0].solves_count} solves</span>
              {entries[0].first_bloods_count > 0 && (
                <span className="text-rose-400 flex items-center gap-0.5">
                  <Flame className="w-3.5 h-3.5 fill-rose-400 inline" />
                  {entries[0].first_bloods_count} FB
                </span>
              )}
            </div>
          </div>

          {/* 3rd Place */}
          <div className="p-5 rounded-xl bg-[#090e1c] border border-slate-700 flex flex-col items-center text-center relative order-3">
            <div className="w-10 h-10 rounded-full bg-amber-700/10 border border-amber-700/30 flex items-center justify-center text-amber-600 mb-2">
              <Medal className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              {entries[2].rank === entries[1].rank ? '3RD PLACE (TIED)' : '3RD PLACE'}
            </span>
            <Link
              to={`/teams/${entries[2].team_slug}`}
              className="text-base font-mono font-bold text-white hover:text-cyan-400 mt-1"
            >
              {entries[2].team_name}
            </Link>
            <span className="text-lg font-mono font-bold text-cyan-400 mt-1">
              {formatPoints(entries[2].score)} PTS
            </span>
            <span className="text-xs font-mono text-slate-500 mt-0.5">
              {entries[2].solves_count} solves
            </span>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090e1c] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0a1020] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5 w-16 text-center">Rank</th>
                <th className="px-6 py-3.5">Team</th>
                <th className="px-6 py-3.5 text-center">Solves</th>
                <th className="px-6 py-3.5 text-center">First Bloods</th>
                <th className="px-6 py-3.5 text-right">Score</th>
                <th className="px-6 py-3.5 text-right hidden sm:table-cell">Last Solve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-cyan-400">
                    <Activity className="w-5 h-5 animate-spin inline mr-2" />
                    COMPILING SCOREBOARD...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No teams found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isUserTeam = myTeam?.id === entry.team_id;
                  return (
                    <tr
                      key={entry.team_id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isUserTeam ? 'bg-cyan-500/5 border-l-2 border-cyan-400' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-center">{getRankBadge(entry)}</td>
                      <td className="px-6 py-4 font-semibold text-slate-100">
                        <Link
                          to={`/teams/${entry.team_slug}`}
                          className="hover:text-cyan-400 transition-colors flex items-center gap-2"
                        >
                          <span>{entry.team_name}</span>
                          {isUserTeam && (
                            <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 text-[10px] rounded border border-cyan-500/30">
                              YOU
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-300">
                        {entry.solves_count}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {entry.first_bloods_count > 0 ? (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                            <Flame className="w-3.5 h-3.5 fill-rose-400" />
                            {entry.first_bloods_count}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-cyan-400 text-sm">
                        {formatPoints(entry.score)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 hidden sm:table-cell">
                        {formatDate(entry.last_solve_at)}
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
  );
};
