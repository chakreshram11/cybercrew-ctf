import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Users,
  Shield,
  Flag,
  FileText,
  HelpCircle,
  TrendingUp,
  Activity,
  Terminal
} from 'lucide-react';
import { formatPoints } from '../../lib/utils';

interface AdminStats {
  participants_count: number;
  teams_count: number;
  challenges_count: number;
  active_challenges_count: number;
  submissions_count: number;
  solves_count: number;
  hints_unlocked_count: number;
  points_deducted_hints: number;
}

export const AdminDashboardPage: React.FC = () => {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get<AdminStats>('/admin/stats');
      return (
        res.success && res.data
          ? res.data
          : {
              participants_count: 0,
              teams_count: 0,
              challenges_count: 0,
              active_challenges_count: 0,
              submissions_count: 0,
              solves_count: 0,
              hints_unlocked_count: 0,
              points_deducted_hints: 0,
            }
      );
    },
  });

  const stats = statsData || {
    participants_count: 0,
    teams_count: 0,
    challenges_count: 0,
    active_challenges_count: 0,
    submissions_count: 0,
    solves_count: 0,
    hints_unlocked_count: 0,
    points_deducted_hints: 0,
  };

  const statCards = [
    {
      title: 'Total Operatives',
      value: stats.participants_count,
      icon: Users,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/30',
    },
    {
      title: 'Active Squads (Teams)',
      value: stats.teams_count,
      icon: Shield,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/30',
    },
    {
      title: 'Challenges (Active/Total)',
      value: `${stats.active_challenges_count} / ${stats.challenges_count}`,
      icon: Flag,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
    },
    {
      title: 'Submissions Tracked',
      value: stats.submissions_count,
      icon: FileText,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/30',
    },
    {
      title: 'Confirmed Solves',
      value: stats.solves_count,
      icon: TrendingUp,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
    },
    {
      title: 'Hints Unlocked (Deductions)',
      value: `${stats.hints_unlocked_count} (-${formatPoints(stats.points_deducted_hints)} pts)`,
      icon: HelpCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30',
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-mono font-bold text-white tracking-wide flex items-center gap-2">
            <Activity className="w-6 h-6 text-rose-400" />
            OPERATIONS COMMAND CENTER
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            REAL-TIME PLATFORM TELEMETRY • SYSTEM GOVERNANCE • COMPETITION METRICS
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            EVENT ENGINE ONLINE
          </span>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="p-5 rounded-xl bg-[#090e1c] border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                  {card.title}
                </p>
                <p className="text-2xl font-mono font-bold text-white">
                  {isLoading ? '...' : card.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${card.bg}`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Activity & Quick Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anti-Cheat & Rapid Security Signals */}
        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-400" />
              Security & Integrity Signals
            </h3>
            <span className="text-[11px] font-mono text-cyan-400">Continuous Monitoring</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Flag Brute-Force Rate Limiting</span>
              <span className="text-emerald-400 font-bold">ARMED (10 req/min)</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Duplicate Solve Concurrency Lock</span>
              <span className="text-emerald-400 font-bold">ACTIVE (UNIQUE DB INDEX)</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Client-Side Flag Isolation</span>
              <span className="text-emerald-400 font-bold">VERIFIED (HMAC BLIND HASH)</span>
            </div>
          </div>
        </div>

        {/* Quick Administrator Actions */}
        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800 space-y-4 font-mono text-xs">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Quick Administration
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <a
              href="/admin/challenges"
              className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-400 transition-colors block text-center"
            >
              + Create Challenge
            </a>
            <a
              href="/admin/submissions"
              className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-400 transition-colors block text-center"
            >
              Audit Submissions
            </a>
            <a
              href="/admin/teams"
              className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-400 transition-colors block text-center"
            >
              Manage Teams & Scores
            </a>
            <a
              href="/admin/settings"
              className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-400 transition-colors block text-center"
            >
              Event Controls
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
