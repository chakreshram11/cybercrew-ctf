import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Submission } from '../../types';
import { FileText, Search, CheckCircle2, XCircle, Terminal } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export const AdminSubmissionsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterResult, setFilterResult] = useState<'ALL' | 'CORRECT' | 'INCORRECT'>('ALL');

  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['admin-submissions'],
    queryFn: async () => {
      const res = await api.get<Submission[]>('/admin/submissions');
      return res.success && res.data ? res.data : [];
    },
    refetchInterval: 10000,
  });

  const submissions = submissionsData || [];
  const filtered = submissions.filter((s) => {
    if (filterResult === 'CORRECT' && !s.is_correct) return false;
    if (filterResult === 'INCORRECT' && s.is_correct) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchChallenge = s.challenge_name?.toLowerCase().includes(q) || false;
      const matchTeam = s.team_name?.toLowerCase().includes(q) || false;
      const matchUser = s.user_name?.toLowerCase().includes(q) || false;
      return matchChallenge || matchTeam || matchUser;
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            SUBMISSIONS AUDIT LOG
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            CHRONOLOGICAL RECORD OF ALL INCOMING FLAG SUBMISSIONS & VERIFICATION OUTCOMES
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by challenge, squad, or operative name..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs font-mono">
          <button
            onClick={() => setFilterResult('ALL')}
            className={`px-3 py-1.5 rounded-md ${
              filterResult === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Submissions
          </button>
          <button
            onClick={() => setFilterResult('CORRECT')}
            className={`px-3 py-1.5 rounded-md ${
              filterResult === 'CORRECT'
                ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Correct Solves
          </button>
          <button
            onClick={() => setFilterResult('INCORRECT')}
            className={`px-3 py-1.5 rounded-md ${
              filterResult === 'INCORRECT'
                ? 'bg-rose-500/20 text-rose-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Incorrect Flags
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#090e1c] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0a1020] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Operative</th>
                <th className="px-4 py-3">Challenge</th>
                <th className="px-4 py-3 text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-cyan-400">
                    <Terminal className="w-4 h-4 animate-spin inline mr-2" />
                    STREAMING SUBMISSION TELEMETRY...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No submissions recorded matching filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-400">{formatDate(s.submitted_at)}</td>
                    <td className="px-4 py-3 font-semibold text-white">{s.team_name || s.team_id}</td>
                    <td className="px-4 py-3 text-slate-300">{s.user_name || s.user_id}</td>
                    <td className="px-4 py-3 text-cyan-400 font-bold">{s.challenge_name || s.challenge_id}</td>
                    <td className="px-4 py-3 text-center">
                      {s.is_correct ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          VALID FLAG
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-bold">
                          <XCircle className="w-3 h-3" />
                          INCORRECT
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
