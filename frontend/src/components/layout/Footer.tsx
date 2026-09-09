import React from 'react';
import { Shield, ExternalLink, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#050811] text-slate-400 py-10 font-mono text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Mission */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-sm">Cyber Crew CTF</p>
              <p className="text-slate-500">Official Platform of Cyber Crew Club</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400">
            <a
              href="https://cybercrew.online"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              Cyber Crew Club <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://ctf.cybercrew.online"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1 text-cyan-400 font-semibold"
            >
              ctf.cybercrew.online
            </a>
            <a href="/rules" className="hover:text-cyan-400 transition-colors">
              Rules & Code of Conduct
            </a>
            <a href="/announcements" className="hover:text-cyan-400 transition-colors">
              Live Broadcasts
            </a>
          </div>

          {/* Copyright & Security */}
          <div className="text-center md:text-right text-slate-500">
            <p className="flex items-center justify-center md:justify-end gap-1">
              Built with <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" /> for Cybersecurity Excellence
            </p>
            <p className="mt-0.5">Zero-Trust Flag Architecture • Realtime CTF Engine</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
