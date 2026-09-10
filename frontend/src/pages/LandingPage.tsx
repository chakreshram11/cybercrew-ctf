import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Shield, Flag, Terminal, Trophy, Users, Zap, Lock, ArrowRight, Clock } from 'lucide-react';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  const { data: publicSettings, isLoading: isSettingsLoading, isError: isSettingsError } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const res = await api.get<{
        ctf_name: string;
        description: string;
        start_date: string;
        end_date: string;
        timezone: string;
        state: string;
        registration_open: boolean;
        scoreboard_frozen: boolean;
      }>('/settings/public');
      return res.success && res.data ? res.data : null;
    },
    staleTime: 10000,
  });

  const eventStartDate = publicSettings?.start_date;
  const eventEndDate = publicSettings?.end_date;
  const eventState = publicSettings?.state;

  const isEnded = eventState === 'ENDED' || (eventEndDate && Date.parse(eventEndDate) <= Date.now());

  return (
    <div className="space-y-24 py-6">
      {/* Hero Section */}
      <section className="text-center relative pt-8 pb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase mb-8 cyber-glow">
          <Zap className="w-3.5 h-3.5" />
          <span>{publicSettings?.ctf_name || 'CYBER CREW CLUB OFFICIAL COMPETITION'}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-mono tracking-tight text-white mb-6">
          HACK. LEARN. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">DEFEND.</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-slate-400 font-sans leading-relaxed mb-10">
          Welcome to <span className="text-slate-200 font-semibold font-mono">{publicSettings?.ctf_name || 'Cyber Crew CTF 2026'}</span>. Test your offensive cybersecurity acumen, reverse engineering dexterity, and cryptographic resilience against real-world challenge scenarios.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          {user ? (
            <Link
              to="/challenges"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-mono font-bold text-base shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all"
            >
              <Flag className="w-5 h-5" />
              ENTER THE ARENA
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-mono font-bold text-base shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all"
              >
                REGISTER TEAM <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-slate-500 text-white font-mono font-semibold text-base transition-all"
              >
                SIGN IN
              </Link>
            </>
          )}
          <Link
            to="/rules"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-slate-400 hover:text-cyan-300 font-mono text-base transition-colors"
          >
            COMPETITION RULES
          </Link>
        </div>

        {/* Countdown Box */}
        <div className="inline-block p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md shadow-2xl">
          {isSettingsLoading ? (
            <div className="flex items-center justify-center gap-2 font-mono text-xs text-cyan-400 py-2">
              <Clock className="w-4 h-4 animate-spin" />
              <span>LOADING EVENT SCHEDULE...</span>
            </div>
          ) : isSettingsError || !eventStartDate ? (
            <div className="flex items-center justify-center gap-2 font-mono text-xs text-slate-400 py-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>EVENT SCHEDULE UNAVAILABLE</span>
            </div>
          ) : isEnded ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-rose-400" />
              <span className="font-bold tracking-wider uppercase">COMPETITION ENDED</span>
            </div>
          ) : (
            <CountdownTimer targetDate={eventStartDate} label="COMPETITION COMMENCEMENT IN" />
          )}
        </div>
      </section>

      {/* Highlights & Key Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-mono font-bold text-white mb-2">Zero-Trust Flag Engine</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Flags are cryptographically hashed using keyed HMAC and never transmitted client-side. Strict server-side rate limits defend against automated brute-force attempts.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-mono font-bold text-white mb-2">Dynamic Scoring & First Blood</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Challenges dynamically adjust points based on solve distribution. First Blood bonuses award pioneer teams who discover the exploit path first.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
          <div className="w-12 h-12 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4">
            <Terminal className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-mono font-bold text-white mb-2">Isolated Live Labs</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Live targets run in sandboxed Docker containers isolated from internal platform services, providing an authentic web and binary exploitation experience.
          </p>
        </div>
      </section>

      {/* CTF Categories */}
      <section className="rounded-2xl p-8 bg-slate-900/40 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-mono font-bold text-white">Challenge Disciplines</h2>
            <p className="text-slate-400 text-sm">Comprehensive multi-domain cybersecurity assessment categories</p>
          </div>
          <Link
            to="/challenges"
            className="inline-flex items-center gap-1.5 text-sm font-mono text-cyan-400 hover:text-cyan-300"
          >
            Browse All Challenges <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-sm">
          {[
            { name: 'Web Exploitation', count: 8 },
            { name: 'Cryptography', count: 6 },
            { name: 'Reverse Engineering', count: 5 },
            { name: 'Binary Exploitation (Pwn)', count: 4 },
            { name: 'Forensics & Memory', count: 6 },
            { name: 'OSINT & Recon', count: 4 },
            { name: 'Network Analysis', count: 5 },
            { name: 'Linux System Internals', count: 4 },
            { name: 'Cloud Security', count: 3 },
            { name: 'AI & LLM Security', count: 3 },
            { name: 'Mobile Security', count: 3 },
            { name: 'Miscellaneous', count: 5 },
          ].map((cat) => (
            <div
              key={cat.name}
              className="p-3.5 rounded-lg bg-[#070b14] border border-slate-800/80 hover:border-slate-700 flex flex-col justify-between"
            >
              <span className="font-semibold text-slate-200 text-xs mb-1">{cat.name}</span>
              <span className="text-[11px] text-cyan-400">{cat.count} Challenges</span>
            </div>
          ))}
        </div>
      </section>

      {/* Community / Club info */}
      <section className="text-center max-w-3xl mx-auto py-6">
        <Shield className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-2xl font-mono font-bold text-white mb-3">Organized by Cyber Crew Club</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Cyber Crew Club is an elite student and professional cybersecurity initiative dedicated to hands-on ethical hacking, vulnerability research, defensive architecture, and capture-the-flag competitions.
        </p>
        <a
          href="https://cybercrew.online"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded border border-slate-700 hover:border-cyan-500/50 text-cyan-400 font-mono text-sm transition-colors"
        >
          <Users className="w-4 h-4" />
          Visit Official Cyber Crew Portal
        </a>
      </section>
    </div>
  );
};
