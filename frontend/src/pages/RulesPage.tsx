import React from 'react';
import { BookOpen, ShieldCheck, AlertTriangle, Scale, Award } from 'lucide-react';

export const RulesPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 font-sans">
      {/* Header */}
      <div className="text-center pb-6 border-b border-slate-800">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3">
          <Scale className="w-6 h-6 text-cyan-400" />
        </div>
        <h1 className="text-3xl font-mono font-bold text-white tracking-wide">
          RULES & CODE OF ENGAGEMENT
        </h1>
        <p className="text-xs font-mono text-slate-400 mt-1">
          CYBER CREW CTF 2026 OFFICIAL COMPETITION POLICIES
        </p>
      </div>

      {/* Rules Grid */}
      <div className="space-y-6">
        {/* Section 1: Target Boundaries */}
        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-mono font-bold text-white">
              1. Platform & Target Boundaries
            </h2>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            All offensive testing, scanning, fuzzing, and exploit payloads must be directed
            <strong> solely</strong> at designated challenge target instances explicitly listed on the
            challenge pages.
          </p>
          <ul className="list-disc list-inside text-slate-400 text-xs font-mono space-y-1.5 pl-2">
            <li>Do NOT attack or attempt denial-of-service against the scoring engine, scoreboard, or web platform.</li>
            <li>Do NOT attack or perform reconnaissance against other participant machines or external infrastructure.</li>
            <li>Denial of Service (DoS/DDoS) of any kind against challenge servers is strictly prohibited.</li>
          </ul>
        </div>

        {/* Section 2: Flag Sharing */}
        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-mono font-bold text-white">
              2. Flag & Exploit Sharing
            </h2>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Cyber Crew CTF is a competitive test of cybersecurity competency. Collaboration is allowed
            only within members of the same registered team.
          </p>
          <ul className="list-disc list-inside text-slate-400 text-xs font-mono space-y-1.5 pl-2">
            <li>Sharing flags, writeups, or direct hints between teams during the active competition is prohibited.</li>
            <li>Possession or submission of flags obtained without completing the challenge will result in disqualification.</li>
            <li>Flag formats adhere strictly to: <code className="text-cyan-400">CCCTF&#123;...&#125;</code></li>
          </ul>
        </div>

        {/* Section 3: Scoring & Hints */}
        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-mono font-bold text-white">
              3. Dynamic Scoring, First Blood & Hints
            </h2>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            The platform computes points through an immutable score ledger:
          </p>
          <ul className="list-disc list-inside text-slate-400 text-xs font-mono space-y-1.5 pl-2">
            <li>Dynamic scoring: Initial challenge points decay as more teams solve the challenge.</li>
            <li>First Blood: The first team to submit a valid flag receives an instant bonus.</li>
            <li>Hint unlocking: Unlocking intelligence hints deducts points from the team score ledger atomically.</li>
          </ul>
        </div>

        {/* Section 4: Reporting Issues */}
        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-mono font-bold text-white">
              4. Bug Bounty & Organizer Discretion
            </h2>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            If you identify a bug in the competition platform itself (e.g. unintended administrative
            exposure or score calculation error), report it immediately to organizers at{' '}
            <code className="text-cyan-400">admin@cybercrew.online</code>.
          </p>
          <p className="text-slate-400 text-xs font-mono">
            Organizers reserve final judgment regarding score adjustments, dispute resolution, and
            disqualifications.
          </p>
        </div>
      </div>
    </div>
  );
};
