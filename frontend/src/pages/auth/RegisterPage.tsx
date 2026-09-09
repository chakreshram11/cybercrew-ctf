import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, UserPlus, AlertCircle, Terminal, CheckCircle2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (username.length < 3 || username.length > 24) {
      setError('Username must be between 3 and 24 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError('Username may only contain letters, numbers, underscores, and dashes.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await signUp(email, password, username);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/challenges');
      }, 2000);
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="bg-[#090e1c] border border-slate-800 rounded-2xl p-8 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-mono font-bold text-white tracking-wide">OPERATIVE ENROLLMENT</h1>
          <p className="text-xs font-mono text-slate-400 mt-1">JOIN CYBER CREW CTF COMPETITION</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-400 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Registration successful! Redirecting to operative arena...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase tracking-wider">
              Callsign / Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="v01d_h4ck3r"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@cybercrew.online"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase tracking-wider">
              Password (min. 8 characters)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-mono font-bold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Terminal className="w-4 h-4 animate-spin" />
                  INITIALIZING PROFILE...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  CREATE OPERATIVE ACCOUNT
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs font-mono text-slate-400">
            Already enrolled?{' '}
            <Link to="/login" className="text-cyan-400 hover:underline font-semibold">
              Sign In Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
