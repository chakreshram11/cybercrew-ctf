import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Shield,
  Flag,
  Trophy,
  Users,
  Bell,
  BookOpen,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  Terminal
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, team, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { name: 'Challenges', path: '/challenges', icon: Flag },
    { name: 'Scoreboard', path: '/scoreboard', icon: Trophy },
    { name: 'Teams', path: '/teams', icon: Users },
    { name: 'Rules', path: '/rules', icon: BookOpen },
    { name: 'Announcements', path: '/announcements', icon: Bell },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <div className="w-full h-full bg-[#070b14] rounded-[7px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-white font-mono text-base">CYBER CREW</span>
                <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 text-[10px] font-mono rounded font-bold border border-cyan-500/30">CTF</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">HACK • LEARN • DEFEND</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium font-mono transition-colors ${
                    active
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {link.name}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium font-mono transition-colors ${
                  isActive('/admin')
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                }`}
              >
                <Settings className="w-4 h-4 text-rose-400" />
                Admin Panel
              </Link>
            )}
          </div>

          {/* User Section */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {team && (
                  <Link
                    to={`/teams/${team.slug}`}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-md text-xs font-mono text-cyan-400 hover:border-cyan-500/50 transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>[{team.name}]</span>
                    <span className="text-slate-400">{team.score} pts</span>
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-md text-sm font-mono text-white transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.username}</span>
                </Link>

                <button
                  onClick={() => signOut()}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-mono text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-md border border-slate-700 transition-colors"
                >
                  <LogIn className="w-4 h-4 text-cyan-400" />
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-mono font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-md shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <UserPlus className="w-4 h-4 text-slate-950" />
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#070b14] px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-base font-mono ${
                isActive(link.path)
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.name}
            </Link>
          ))}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30"
            >
              <Settings className="w-5 h-5" />
              Admin Panel
            </Link>
          )}

          <div className="pt-4 border-t border-slate-800">
            {user ? (
              <div className="space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-900 border border-slate-800 text-sm font-mono text-white"
                >
                  <span>{user.username}</span>
                  {team && <span className="text-cyan-400">[{team.name}]</span>}
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2 text-sm font-mono text-center rounded-md border border-slate-700 text-white"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2 text-sm font-mono font-semibold text-center rounded-md bg-cyan-400 text-slate-950"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
