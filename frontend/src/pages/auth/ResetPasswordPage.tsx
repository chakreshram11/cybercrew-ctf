import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, CheckCircle2, AlertCircle, Terminal } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (password.length < 8) {
      setStatusMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setStatusMsg({ type: 'error', text: error.message });
      } else {
        setStatusMsg({
          type: 'success',
          text: 'Password updated successfully. Redirecting to login...',
        });
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to reset password.' });
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
            SET NEW CREDENTIAL
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            ENTER SECURE REPLACEMENT PASSWORD
          </p>
        </div>

        {statusMsg && (
          <div
            className={`mb-6 p-3.5 rounded-lg border font-mono text-xs flex items-center gap-2.5 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-300 uppercase mb-1.5">New Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 uppercase mb-1.5">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <Terminal className="w-4 h-4 animate-spin" />
                UPDATING...
              </>
            ) : (
              'CONFIRM PASSWORD RESET'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
