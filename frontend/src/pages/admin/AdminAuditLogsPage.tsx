import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Search, Terminal, Activity } from 'lucide-react';
import { formatDate } from '../../lib/utils';

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, any>;
  created_at: string;
  actor?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

export const AdminAuditLogsPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const res = await api.get<AuditLog[]>('/admin/audit-logs');
      return res.success && res.data ? res.data : [];
    },
    refetchInterval: 15000,
  });

  const logs = logsData || [];
  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.resource_type.toLowerCase().includes(search.toLowerCase()) ||
      l.actor?.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-400" />
            SECURITY AUDIT LOGS
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            CHRONOLOGICAL TRAIL OF ADMINISTRATIVE GOVERNANCE, SCORE ADJUSTMENTS, AND SCENARIO CHANGES
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter audit logs..."
          className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
        />
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#090e1c] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0a1020] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target Resource</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-cyan-400">
                    <Terminal className="w-4 h-4 animate-spin inline mr-2" />
                    STREAMING AUDIT TELEMETRY...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No audit records located matching filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {log.resource_type}
                      {log.resource_id ? ` #${log.resource_id.slice(0, 8)}` : ''}
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">
                      {log.actor?.username || 'SYSTEM'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate font-mono text-[11px]">
                      {JSON.stringify(log.metadata)}
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
