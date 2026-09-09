import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Terminal, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export const ProfilePage: React.FC = () => {
  const { user, team } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (newPassword.length < 8) {
      setStatusMsg({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setStatusMsg({ type: 'error', text: error.message });
      } else {
        setStatusMsg({ type: 'success', text: 'Security credentials successfully updated.' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to update credentials.' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-5 h-5 text-cyan-400" />
          <h1 className="text-2xl font-mono font-bold text-white tracking-wide">
            OPERATIVE DOSSIER
          </h1>
        </div>
        <p className="text-xs font-mono text-slate-400">
          IDENTITY CREDENTIALS • PARTICIPATION METRICS • SQUAD ASSIGNMENT
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-mono text-3xl font-bold text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-mono font-bold text-white">{user.username}</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>

          <div className="mt-4 pt-4 border-t border-slate-800 w-full space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>SECURITY ROLE:</span>
              <span className="text-cyan-400 font-bold">{user.role}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>SQUAD / TEAM:</span>
              <span className="text-white font-semibold">
                {team ? team.name : 'UNASSIGNED'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>JOINED:</span>
              <span className="text-slate-300">{formatDate(user.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Change Password / Security */}
        <div className="md:col-span-2 p-6 rounded-xl bg-[#090e1c] border border-slate-800">
          <h3 className="text-base font-mono font-bold text-white mb-2 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            UPDATE ACCESS KEY (PASSWORD)
          </h3>
          <p className="text-xs font-mono text-slate-400 mb-6">
            Rotate operative account password to maintain cryptographic hygiene.
          </p>

          {statusMsg && (
            <div
              className={`p-3 rounded-lg font-mono text-xs mb-4 flex items-center gap-2 border ${
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

          <form onSubmit={handlePasswordChange} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-slate-300 uppercase mb-1.5">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
              className="px-5 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Terminal className="w-4 h-4 animate-spin" />
                  UPDATING...
                </>
              ) : (
                'SAVE NEW CREDENTIAL'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
