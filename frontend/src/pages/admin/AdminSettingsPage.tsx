import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { CompetitionSettings } from '../../types';
import { Settings, Save, CheckCircle2, AlertCircle, Terminal, Shield } from 'lucide-react';
import { parseIsoToIstDateAndTime, combineIstDateAndTimeToIso } from '../../lib/utils';

export const AdminSettingsPage: React.FC = () => {
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // IST Date & Time field state
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  const { data: settingsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await api.get<CompetitionSettings>('/admin/settings');
      const fallback: CompetitionSettings = {
        ctf_name: 'Cyber Crew CTF 2026',
        description: 'Official Capture The Flag Competition Platform for Cyber Crew Club.',
        start_date: '2026-09-10T03:30:00.000Z', // 09:00 AM IST
        end_date: '2026-09-15T11:30:00.000Z',   // 05:00 PM IST
        timezone: 'Asia/Kolkata',
        state: 'LIVE',
        registration_open: true,
        max_team_size: 4,
        min_team_size: 1,
        allow_negative_scores: false,
        dynamic_scoring_enabled: true,
        first_blood_enabled: true,
        hints_enabled: true,
        scoreboard_frozen: false,
        submission_rate_limit: 10,
      };
      return res.success && res.data ? res.data : fallback;
    },
  });

  const [settings, setSettings] = useState<CompetitionSettings | null>(null);

  React.useEffect(() => {
    if (settingsData && !settings) {
      setSettings(settingsData);
      const startParsed = parseIsoToIstDateAndTime(settingsData.start_date);
      const endParsed = parseIsoToIstDateAndTime(settingsData.end_date);
      setStartDate(startParsed.date || '2026-09-10');
      setStartTime(startParsed.time || '09:00');
      setEndDate(endParsed.date || '2026-09-15');
      setEndTime(endParsed.time || '17:00');
    }
  }, [settingsData, settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setStatusMsg(null);

    // Client-side Date & Time Validation
    if (!startDate) {
      setStatusMsg({ type: 'error', text: 'Start date is required.' });
      setSaving(false);
      return;
    }
    if (!startTime) {
      setStatusMsg({ type: 'error', text: 'Start time is required.' });
      setSaving(false);
      return;
    }
    if (!endDate) {
      setStatusMsg({ type: 'error', text: 'End date is required.' });
      setSaving(false);
      return;
    }
    if (!endTime) {
      setStatusMsg({ type: 'error', text: 'End time is required.' });
      setSaving(false);
      return;
    }

    const isoStart = combineIstDateAndTimeToIso(startDate, startTime);
    const isoEnd = combineIstDateAndTimeToIso(endDate, endTime);

    const startTimeMs = new Date(isoStart).getTime();
    const endTimeMs = new Date(isoEnd).getTime();

    if (isNaN(startTimeMs)) {
      setStatusMsg({ type: 'error', text: 'Invalid Start IST date or time format.' });
      setSaving(false);
      return;
    }

    if (isNaN(endTimeMs)) {
      setStatusMsg({ type: 'error', text: 'Invalid End IST date or time format.' });
      setSaving(false);
      return;
    }

    if (startTimeMs >= endTimeMs) {
      setStatusMsg({ type: 'error', text: 'Start date/time must be before end date/time.' });
      setSaving(false);
      return;
    }

    // Explicitly construct payload with ONLY Whitelisted DTO fields (excluding id, logo_url, updated_at)
    const payload = {
      ctf_name: settings.ctf_name,
      description: settings.description,
      start_date: isoStart,
      end_date: isoEnd,
      timezone: 'Asia/Kolkata',
      state: settings.state,
      registration_open: settings.registration_open,
      max_team_size: settings.max_team_size,
      min_team_size: settings.min_team_size,
      allow_negative_scores: settings.allow_negative_scores,
      dynamic_scoring_enabled: settings.dynamic_scoring_enabled,
      first_blood_enabled: settings.first_blood_enabled,
      hints_enabled: settings.hints_enabled,
      scoreboard_frozen: settings.scoreboard_frozen,
      freeze_time: settings.freeze_time || undefined,
      submission_rate_limit: settings.submission_rate_limit,
      maintenance_mode: settings.maintenance_mode || false,
    };

    try {
      const res = await api.patch('/admin/settings', payload);
      if (res.success) {
        setStatusMsg({ type: 'success', text: 'Competition settings successfully applied.' });
        refetch();
      } else {
        setStatusMsg({ type: 'error', text: res.error?.message || 'Failed to update settings.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network connection failure while saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="py-24 text-center font-mono text-cyan-400 text-sm flex items-center justify-center gap-2">
        <Terminal className="w-5 h-5 animate-spin" />
        <span>READING SYSTEM PARAMETERS...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            COMPETITION & PLATFORM PARAMETERS
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            CONSTRAINTS, SCORING POLICIES, EVENT TIMELINES, AND RATE GOVERNANCE (IST)
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-lg border font-mono text-xs flex items-center gap-2.5 ${
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

      <form onSubmit={handleSave} className="space-y-6 font-mono text-xs">
        {/* Core Event Information */}
        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            Core Event Identity
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 uppercase mb-1">Competition Title</label>
              <input
                type="text"
                required
                value={settings.ctf_name}
                onChange={(e) => setSettings({ ...settings, ctf_name: e.target.value })}
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 uppercase mb-1">Event State Lifecycle</label>
              <select
                value={settings.state}
                onChange={(e) => setSettings({ ...settings, state: e.target.value as any })}
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold focus:outline-none focus:border-cyan-400"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="REGISTRATION_OPEN">REGISTRATION_OPEN</option>
                <option value="UPCOMING">UPCOMING</option>
                <option value="LIVE">LIVE (COMPETITION ACTIVE)</option>
                <option value="ENDED">ENDED (FREEZE SCORING)</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 uppercase mb-1">Briefing Description</label>
            <textarea
              rows={2}
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 font-sans focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Schedule & Team Size Rules */}
        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Timelines & Roster Bounds (India Standard Time - IST / Asia/Kolkata)
          </h3>

          {/* Start Date & Time */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
              START BOUNDARY (IST)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 uppercase mb-1">Start Date (IST)</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 uppercase mb-1">Start Time (IST)</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* End Date & Time */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
              END BOUNDARY (IST)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 uppercase mb-1">End Date (IST)</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 uppercase mb-1">End Time (IST)</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-slate-300 uppercase mb-1">Max Squad Size</label>
              <input
                type="number"
                min={1}
                max={20}
                value={settings.max_team_size}
                onChange={(e) =>
                  setSettings({ ...settings, max_team_size: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-300 uppercase mb-1">
                Rate Limit (Attempts/Min)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={settings.submission_rate_limit}
                onChange={(e) =>
                  setSettings({ ...settings, submission_rate_limit: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-300 uppercase mb-1">Registration Status</label>
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, registration_open: !settings.registration_open })
                }
                className={`w-full py-2 rounded border font-bold transition-colors ${
                  settings.registration_open
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                }`}
              >
                {settings.registration_open ? 'OPEN FOR ENROLLMENT' : 'REGISTRATION CLOSED'}
              </button>
            </div>
          </div>
        </div>

        {/* Scoring Engine Controls */}
        <div className="p-6 rounded-xl bg-[#090e1c] border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Scoring Engine & Integrity Switches
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.dynamic_scoring_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, dynamic_scoring_enabled: e.target.checked })
                }
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-950 border-slate-700"
              />
              <span className="text-slate-300">Enable Dynamic Challenge Point Decay</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.first_blood_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, first_blood_enabled: e.target.checked })
                }
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-950 border-slate-700"
              />
              <span className="text-slate-300">Award First Blood Pioneer Bonus</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_negative_scores}
                onChange={(e) =>
                  setSettings({ ...settings, allow_negative_scores: e.target.checked })
                }
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-950 border-slate-700"
              />
              <span className="text-slate-300">Allow Negative Team Scores</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.scoreboard_frozen}
                onChange={(e) =>
                  setSettings({ ...settings, scoreboard_frozen: e.target.checked })
                }
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-950 border-slate-700"
              />
              <span className="text-slate-300">Freeze Public Scoreboard</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm disabled:opacity-50 transition-colors shadow-lg shadow-cyan-500/20"
          >
            <Save className="w-4 h-4" />
            {saving ? 'UPDATING SYSTEM PARAMETERS...' : 'COMMIT EVENT POLICIES'}
          </button>
        </div>
      </form>
    </div>
  );
};
