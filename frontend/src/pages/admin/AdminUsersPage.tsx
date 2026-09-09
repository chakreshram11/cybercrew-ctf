import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { User, UserRole } from '../../types';
import { Users, Search, Ban, Check, Terminal } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export const AdminUsersPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get<User[]>('/admin/users');
      return res.success && res.data ? res.data : [];
    },
  });

  const users = usersData || [];
  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleStatus = async (user: User) => {
    const action = user.is_active ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${action} user ${user.username}?`)) return;

    try {
      const res = await api.patch(`/admin/users/${user.id}`, { is_active: !user.is_active });
      if (res.success) {
        refetch();
      }
    } catch {
      alert('Failed to update operative account status.');
    }
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      if (res.success) {
        refetch();
      }
    } catch {
      alert('Failed to update operative role.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            OPERATIVE USER DIRECTORY
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            GOVERN ROLES, RBAC AUTHORIZATIONS, AND ACCOUNT ACTIVATION LIFECYCLES
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by callsign or email..."
          className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
        />
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#090e1c] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0a1020] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Operative Callsign</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Enrolled</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-cyan-400">
                    <Terminal className="w-4 h-4 animate-spin inline mr-2" />
                    QUERYING OPERATIVE REGISTRY...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-cyan-400 font-bold">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      {u.username}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-400 text-xs font-mono focus:outline-none"
                      >
                        <option value="PARTICIPANT">PARTICIPANT</option>
                        <option value="TEAM_CAPTAIN">TEAM_CAPTAIN</option>
                        <option value="CHALLENGE_AUTHOR">CHALLENGE_AUTHOR</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                          SUSPENDED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`p-1.5 rounded transition-colors ${
                          u.is_active
                            ? 'hover:bg-rose-500/20 text-rose-400'
                            : 'hover:bg-emerald-500/20 text-emerald-400'
                        }`}
                        title={u.is_active ? 'Suspend Operative' : 'Reactivate Operative'}
                      >
                        {u.is_active ? <Ban className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
