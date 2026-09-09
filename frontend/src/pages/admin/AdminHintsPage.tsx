import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ChallengeHint, Challenge } from '../../types';
import { HelpCircle, Plus, Search, Trash2, Terminal, AlertCircle } from 'lucide-react';

export const AdminHintsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formChallengeId, setFormChallengeId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCost, setFormCost] = useState(50);
  const [formContent, setFormContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: challenges } = useQuery({
    queryKey: ['admin-challenges-for-hints'],
    queryFn: async () => {
      const res = await api.get<Challenge[]>('/admin/challenges');
      return res.success && res.data ? res.data : [];
    },
  });

  const { data: hintsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-hints'],
    queryFn: async () => {
      const res = await api.get<(ChallengeHint & { challenge_name?: string })[]>('/admin/hints');
      return res.success && res.data ? res.data : [];
    },
  });

  const hints = hintsData || [];
  const filtered = hints.filter(
    (h) =>
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.challenge_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChallengeId || !formContent.trim()) return;
    setSaving(true);
    setFormError(null);

    try {
      const res = await api.post(`/admin/challenges/${formChallengeId}/hints`, {
        title: formTitle.trim() || 'Intelligence Hint',
        cost: Number(formCost),
        content: formContent.trim(),
        is_active: true,
      });

      if (res.success) {
        setShowModal(false);
        setFormTitle('');
        setFormContent('');
        refetch();
      } else {
        setFormError(res.error?.message || 'Failed to create hint.');
      }
    } catch {
      setFormError('Network connection error.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this hint?')) return;
    try {
      const res = await api.delete(`/admin/hints/${id}`);
      if (res.success) {
        refetch();
      }
    } catch {
      alert('Failed to delete hint.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            INTELLIGENCE HINTS ARBITRATION
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            CONSTRUCT PROGRESSIVE HINTS, MANAGE POINT DEDUCTION COSTS, AND AUDIT ACCESS
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            if (challenges && challenges.length > 0) {
              setFormChallengeId(challenges[0].id);
            }
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-mono text-xs font-bold shadow-md shadow-cyan-500/20 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-4 h-4" />
          NEW HINT
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter hints by challenge or title..."
          className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
        />
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#090e1c] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0a1020] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Hint Title</th>
                <th className="px-4 py-3">Challenge</th>
                <th className="px-4 py-3 text-right">Deduction Cost</th>
                <th className="px-4 py-3">Content Excerpt</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-cyan-400">
                    <Terminal className="w-4 h-4 animate-spin inline mr-2" />
                    LOADING HINTS TELEMETRY...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No hints configured.
                  </td>
                </tr>
              ) : (
                filtered.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-white">{h.title}</td>
                    <td className="px-4 py-3 text-cyan-400">{h.challenge_name || h.challenge_id}</td>
                    <td className="px-4 py-3 text-right font-bold text-rose-400">-{h.cost} PTS</td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate font-sans text-xs">
                      {h.content || '(Hidden until unlocked)'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Delete Hint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#090e1c] border border-slate-700 rounded-2xl p-6 font-mono text-xs shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              CREATE CHALLENGE HINT
            </h3>

            {formError && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-slate-300 uppercase mb-1">Target Challenge</label>
                <select
                  required
                  value={formChallengeId}
                  onChange={(e) => setFormChallengeId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                >
                  <option value="">Select Challenge...</option>
                  {challenges?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.difficulty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Look at cookie decoding"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Point Cost</label>
                  <input
                    type="number"
                    min={0}
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Hint Content</label>
                <textarea
                  rows={4}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Provide targeted guidance or reference documentation..."
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 font-sans"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 disabled:opacity-50"
                >
                  {saving ? 'SAVING...' : 'PUBLISH HINT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
