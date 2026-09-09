import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, AlertCircle, CheckCircle2, Terminal } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('An unexpected error occurred while requesting password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-[#090e1c] border border-slate-800 rounded-2xl p-8 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-mono font-bold text-white tracking-wide">
            RECOVER CREDENTIALS
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            ENTER REGISTERED OPERATIVE EMAIL ADDRESS
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                Recovery dispatch dispatched. Check your inbox for a secure password reset link.
              </span>
            </div>
            <Link
              to="/login"
              className="block w-full text-center py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs hover:border-slate-500"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase tracking-wider">
                Operative Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@cybercrew.online"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-mono font-bold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Terminal className="w-4 h-4 animate-spin" />
                  TRANSMITTING RECOVERY...
                </>
              ) : (
                'SEND RECOVERY LINK'
              )}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <Link to="/login" className="text-xs font-mono text-cyan-400 hover:underline">
            ← Back to Operative Login
          </Link>
        </div>
      </div>
    </div>
  );
};
