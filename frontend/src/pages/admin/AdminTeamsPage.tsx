import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Team } from '../../types';
import { Shield, Search, Sliders, Terminal, AlertCircle } from 'lucide-react';
import { formatPoints } from '../../lib/utils';

export const AdminTeamsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [adjustingTeam, setAdjustingTeam] = useState<Team | null>(null);
  const [adjustPoints, setAdjustPoints] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const { data: teamsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const res = await api.get<Team[]>('/admin/teams');
      return res.success && res.data ? res.data : [];
    },
  });

  const teams = teamsData || [];
  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleScoreAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingTeam || !adjustReason.trim()) return;

    setAdjustLoading(true);
    setAdjustError(null);

    try {
      const res = await api.post(`/admin/teams/${adjustingTeam.id}/adjust-score`, {
        points: Number(adjustPoints),
        reason: adjustReason.trim(),
      });

      if (res.success) {
        setAdjustingTeam(null);
        setAdjustReason('');
        refetch();
      } else {
        setAdjustError(res.error?.message || 'Failed to adjust squad score.');
      }
    } catch {
      setAdjustError('Network error during score adjustment.');
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            SQUAD MANAGEMENT & SCORE LEDGER ARBITRATION
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            MANAGE TEAMS, AUDIT PARTICIPANTS, AND EXECUTE AUDITED SCORE ADJUSTMENTS
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter squads by name..."
          className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
        />
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#090e1c] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0a1020] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Squad Name</th>
                <th className="px-4 py-3">Invite Code</th>
                <th className="px-4 py-3 text-center">Operatives</th>
                <th className="px-4 py-3 text-center">Solves</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-cyan-400">
                    <Terminal className="w-4 h-4 animate-spin inline mr-2" />
                    AUDITING REGISTERED SQUADS...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No squads found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-white">
                      <a href={`/teams/${t.slug}`} className="hover:text-cyan-400 transition-colors">
                        {t.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-cyan-400 tracking-wider">
                      {t.invite_code || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {t.members?.length || 1}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{t.solves_count || 0}</td>
                    <td className="px-4 py-3 text-right font-bold text-cyan-400">
                      {formatPoints(t.score)} PTS
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setAdjustingTeam(t);
                          setAdjustPoints(100);
                          setAdjustReason('');
                          setAdjustError(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-colors text-[11px]"
                      >
                        <Sliders className="w-3 h-3" />
                        ADJUST SCORE
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Adjustment Modal */}
      {adjustingTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#090e1c] border border-slate-700 rounded-2xl p-6 font-mono text-xs shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              ARBITRATE SQUAD SCORE
            </h3>
            <p className="text-slate-400 mb-4">
              Team: <strong className="text-white">{adjustingTeam.name}</strong> (Current:{' '}
              <span className="text-cyan-400 font-bold">{formatPoints(adjustingTeam.score)} PTS</span>)
            </p>

            {adjustError && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            <form onSubmit={handleScoreAdjustment} className="space-y-4">
              <div>
                <label className="block text-slate-300 uppercase mb-1">
                  Point Delta (Positive or Negative)
                </label>
                <input
                  type="number"
                  required
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(Number(e.target.value))}
                  placeholder="e.g. 100 or -50"
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">
                  Audit Reason (Mandatory)
                </label>
                <textarea
                  rows={3}
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Compensation for challenge target crash / Bonus for exemplary writeup"
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 font-sans focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingTeam(null)}
                  className="flex-1 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="flex-1 py-2 rounded bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 disabled:opacity-50"
                >
                  {adjustLoading ? 'APPLYING...' : 'COMMIT TRANSACTION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
