import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Announcement } from '../types';
import { Bell, Info, AlertTriangle, CheckCircle, ShieldAlert, Terminal } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { useRealtimeAnnouncements } from '../hooks/useRealtimeAnnouncements';

export const AnnouncementsPage: React.FC = () => {
  useRealtimeAnnouncements();
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await api.get<Announcement[]>('/announcements');
      return res.success && res.data ? res.data : [];
    },
    refetchInterval: 30000,
  });

  const list = announcements || [];

  const getSeverityBadge = (severity: Announcement['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-mono font-bold uppercase">
            <ShieldAlert className="w-3.5 h-3.5" />
            CRITICAL BROADCAST
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-mono font-bold uppercase">
            <AlertTriangle className="w-3.5 h-3.5" />
            WARNING
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold uppercase">
            <CheckCircle className="w-3.5 h-3.5" />
            SOLVE MILESTONE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-mono font-bold uppercase">
            <Info className="w-3.5 h-3.5" />
            BULLETIN
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-mono font-bold text-white tracking-wide">
              EVENT BROADCASTS
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-400">
            OFFICIAL UPDATES, SYSTEM HINTS, INFRASTRUCTURE ALERTS & ANNOUNCEMENTS
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center font-mono text-cyan-400 text-sm flex items-center justify-center gap-2">
          <Terminal className="w-5 h-5 animate-spin" />
          <span>LISTENING TO FREQUENCY CHANNELS...</span>
        </div>
      ) : list.length === 0 ? (
        <div className="py-16 text-center border border-slate-800 rounded-xl bg-[#090e1c] text-slate-500 font-mono text-xs">
          No announcements broadcasted yet. Stand by on this frequency.
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-xl border border-slate-800 bg-[#090e1c] hover:border-slate-700 transition-colors space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(item.severity)}
                  <h3 className="text-base font-mono font-bold text-white">{item.title}</h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {formatDate(item.published_at || item.created_at)}
                </span>
              </div>

              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                {item.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
