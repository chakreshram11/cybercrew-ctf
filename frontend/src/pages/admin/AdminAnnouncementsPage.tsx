import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Announcement } from '../../types';
import { Bell, Plus, Trash2, Terminal, AlertCircle } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export const AdminAnnouncementsPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [severity, setSeverity] = useState<Announcement['severity']>('INFO');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: announcements, isLoading, refetch } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const res = await api.get<Announcement[]>('/admin/announcements');
      return res.success && res.data ? res.data : [];
    },
  });

  const list = announcements || [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await api.post('/admin/announcements', {
        title: title.trim(),
        content: content.trim(),
        severity,
        is_published: true,
      });

      if (res.success) {
        setShowModal(false);
        setTitle('');
        setContent('');
        refetch();
      } else {
        setError(res.error?.message || 'Failed to publish announcement.');
      }
    } catch {
      setError('Network connection error.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this broadcast announcement?')) return;
    try {
      const res = await api.delete(`/admin/announcements/${id}`);
      if (res.success) {
        refetch();
      }
    } catch {
      alert('Failed to delete announcement.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            BROADCAST ANNOUNCEMENTS
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            DISPATCH CRITICAL UPDATES, SYSTEM BULLETINS, AND PLATFORM NOTIFICATIONS
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-mono text-xs font-bold shadow-md shadow-cyan-500/20 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-4 h-4" />
          NEW BROADCAST
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#090e1c] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0a1020] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Message Excerpt</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-cyan-400">
                    <Terminal className="w-4 h-4 animate-spin inline mr-2" />
                    QUERYING BROADCAST ARCHIVE...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No announcements broadcasted.
                  </td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-400">
                      {formatDate(item.published_at || item.created_at)}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase border ${
                          item.severity === 'CRITICAL'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : item.severity === 'WARNING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : item.severity === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{item.title}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-sm truncate font-sans text-xs">
                      {item.content}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Delete Broadcast"
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
              <Bell className="w-5 h-5 text-cyan-400" />
              DISPATCH ANNOUNCEMENT
            </h3>

            {error && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-slate-300 uppercase mb-1">Headline</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Target Service Maintenance Completed"
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 font-bold"
                >
                  <option value="INFO">INFO (Standard Bulletin)</option>
                  <option value="SUCCESS">SUCCESS (Solve Milestone)</option>
                  <option value="WARNING">WARNING (Target Warning)</option>
                  <option value="CRITICAL">CRITICAL (System Alert)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Broadcast Message</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write announcement text..."
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
                  {saving ? 'TRANSMITTING...' : 'DISPATCH NOW'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
