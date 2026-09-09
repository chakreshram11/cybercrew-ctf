import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Flag,
  Users,
  Shield,
  FileText,
  HelpCircle,
  Bell,
  Settings,
  ArrowLeft,
  Activity
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center font-mono text-cyan-400">
        <Activity className="w-6 h-6 animate-spin mr-2" />
        Verifying Security Credentials...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Challenges', path: '/admin/challenges', icon: Flag },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Teams', path: '/admin/teams', icon: Shield },
    { name: 'Submissions', path: '/admin/submissions', icon: FileText },
    { name: 'Hints', path: '/admin/hints', icon: HelpCircle },
    { name: 'Announcements', path: '/admin/announcements', icon: Bell },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: Activity },
    { name: 'Event Settings', path: '/admin/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/admin' && location.pathname === '/admin') return true;
    if (path !== '/admin' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen flex bg-[#050811] text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#070b14] border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <span className="font-mono font-bold text-white text-sm">ADMIN CONSOLE</span>
              <p className="text-[10px] text-rose-400 font-mono">RESTRICTED AREA</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3">
          <Link
            to="/challenges"
            className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors border border-cyan-500/30"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Public CTF
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono transition-colors ${
                  active
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-rose-400' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs font-mono text-slate-500">
          <p className="text-slate-400 font-semibold">{user.username}</p>
          <p className="text-[11px] text-cyan-400">{user.role}</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-800 bg-[#070b14]/60 px-8 flex items-center justify-between">
          <h1 className="text-lg font-mono font-bold text-slate-200">Cyber Crew Administration Hub</h1>
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            SYS STATUS: OPERATIONAL
          </span>
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
