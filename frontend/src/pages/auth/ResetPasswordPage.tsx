import React from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole, ShieldAlert, Mail, HelpCircle, ArrowLeft } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const adminEmail = import.meta.env.VITE_ADMIN_CONTACT_EMAIL;

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-[#090e1c] border border-slate-800 rounded-2xl p-8 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <LockKeyhole className="w-6 h-6 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-mono font-bold text-white tracking-wide">
            Password Reset
          </h1>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-slate-400 font-mono text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Self-Service Reset Disabled</span>
          </div>
        </div>

        <div className="space-y-4 font-mono text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <p className="font-semibold text-slate-200 leading-relaxed">
              Participant self-service password reset is disabled for security reasons.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Password resets are managed directly by Cyber Crew CTF administrators. Please reach out to an administrator for account recovery.
            </p>
          </div>

          {adminEmail ? (
            <div className="p-3.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-cyan-300">
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                <span className="truncate">{adminEmail}</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-400">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span>Please contact a Cyber Crew CTF administrator.</span>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {adminEmail ? (
            <a
              href={`mailto:${adminEmail}?subject=Cyber%20Crew%20CTF%20Password%20Reset%20Request`}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-mono font-bold text-xs shadow-md shadow-cyan-500/20 transition-all text-center"
            >
              <Mail className="w-4 h-4" />
              Contact Admin
            </a>
          ) : (
            <div className="flex-1 text-center py-3 px-4 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono text-xs">
              Please contact a Cyber Crew CTF administrator.
            </div>
          )}
          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 py-3 px-5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-mono font-bold text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Login
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <Link to="/login" className="text-xs font-mono text-cyan-400 hover:underline inline-flex items-center gap-1">
            ← Back to Operative Login
          </Link>
        </div>
      </div>
    </div>
  );
};
