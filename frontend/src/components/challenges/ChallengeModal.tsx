import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Challenge, ChallengeHint } from '../../types';
import { DifficultyBadge, CategoryBadge } from '../common/Badges';
import {
  X,
  Flag,
  Download,
  Terminal,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  ExternalLink,
  Flame,
  Users
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatPoints } from '../../lib/utils';

interface ChallengeModalProps {
  challenge: Challenge;
  isOpen: boolean;
  onClose: () => void;
  onSolveSuccess?: (pointsAwarded: number, isFirstBlood: boolean) => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  challenge,
  isOpen,
  onClose,
  onSolveSuccess,
}) => {
  const queryClient = useQueryClient();
  const { user, team, refreshProfile } = useAuth();
  const [flag, setFlag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    status: 'idle' | 'correct' | 'incorrect' | 'already_solved' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const [hints, setHints] = useState<ChallengeHint[]>(challenge.hints || []);
  const [unlockingHintId, setUnlockingHintId] = useState<string | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim() || submitting) return;

    if (!user) {
      setSubmissionResult({
        status: 'error',
        message: 'You must be authenticated to submit flags.',
      });
      return;
    }

    if (!team) {
      setSubmissionResult({
        status: 'error',
        message: 'You must create or join a team before submitting flags.',
      });
      return;
    }

    setSubmitting(true);
    setSubmissionResult({ status: 'idle' });

    try {
      const res = await api.post<{
        is_correct: boolean;
        is_first_blood: boolean;
        points_awarded: number;
        already_solved?: boolean;
        message: string;
      }>(`/challenges/${challenge.id}/submit`, { flag: flag.trim() });

      if (res.success && res.data) {
        if (res.data.is_correct) {
          setSubmissionResult({
            status: 'correct',
            message: `Flag Correct! +${res.data.points_awarded} Points awarded${
              res.data.is_first_blood ? ' (🩸 FIRST BLOOD BONUS APPLIED!)' : ''
            }`,
          });
          challenge.is_solved = true;
          queryClient.invalidateQueries({ queryKey: ['challenges'] });
          queryClient.invalidateQueries({ queryKey: ['team-progress'] });
          queryClient.invalidateQueries({ queryKey: ['scoreboard'] });
          onSolveSuccess?.(res.data.points_awarded, res.data.is_first_blood);
          await refreshProfile();
        } else if (res.data.already_solved) {
          setSubmissionResult({
            status: 'already_solved',
            message: 'Your team has already solved this challenge.',
          });
        } else {
          setSubmissionResult({
            status: 'incorrect',
            message: 'Incorrect flag. Check your exploit payload or analysis.',
          });
        }
      } else {
        setSubmissionResult({
          status: 'error',
          message: res.error?.message || 'Flag submission failed.',
        });
      }
    } catch {
      setSubmissionResult({
        status: 'error',
        message: 'Network connection error during flag submission.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlockHint = async (hintId: string) => {
    setHintError(null);
    setUnlockingHintId(hintId);

    try {
      const res = await api.post<{
        hint_id: string;
        content: string;
        cost: number;
      }>(`/challenges/${challenge.id}/hints/${hintId}/unlock`);

      if (res.success && res.data) {
        setHints((prev) =>
          prev.map((h) =>
            h.id === hintId
              ? { ...h, is_unlocked: true, content: res.data!.content }
              : h
          )
        );
        queryClient.invalidateQueries({ queryKey: ['team-progress'] });
        queryClient.invalidateQueries({ queryKey: ['scoreboard'] });
        await refreshProfile();
      } else {
        setHintError(res.error?.message || 'Failed to unlock hint. Insufficient points or restriction.');
      }
    } catch {
      setHintError('Network error while unlocking hint.');
    } finally {
      setUnlockingHintId(null);
    }
  };

  const handleDownloadArtifact = async (fileId: string, defaultPath: string) => {
    try {
      const res = await api.get<{ download_url: string }>(`/challenges/files/${fileId}/download`);
      const targetUrl = res.success && res.data?.download_url ? res.data.download_url : defaultPath;
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(defaultPath, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#090e1c] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-[#0a1020]/90 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CategoryBadge category={challenge.category?.name || challenge.challenge_type} />
              <DifficultyBadge difficulty={challenge.difficulty} />
              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {formatPoints(challenge.current_points || challenge.base_points)} PTS
              </span>
              {challenge.first_blood_team && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                  <Flame className="w-3.5 h-3.5 fill-rose-400" />
                  <span>First Blood: {challenge.first_blood_team.name}</span>
                </span>
              )}
            </div>
            <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
              {challenge.name}
              {challenge.is_solved && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </h2>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-1">
              <span>Author: {challenge.author_name || 'Cyber Crew Team'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                {challenge.solves_count} solves
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto font-sans text-sm">
          {/* Description */}
          <div className="prose prose-invert prose-cyan max-w-none font-sans text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            {challenge.description}
          </div>

          {/* Live Challenge Target Box (if any) */}
          {challenge.target && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 font-mono text-xs space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider">
                <Terminal className="w-4 h-4" />
                <span>Live Target Environment</span>
              </div>
              {challenge.target.target_url ? (
                <div className="flex items-center justify-between bg-[#070b14] p-2.5 rounded border border-slate-800">
                  <span className="text-slate-300 truncate">{challenge.target.target_url}</span>
                  <a
                    href={challenge.target.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 px-2 py-1 bg-cyan-500/10 rounded ml-2"
                  >
                    Open Target <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="bg-[#070b14] p-2.5 rounded border border-slate-800 text-slate-200">
                  <code>nc {challenge.target.target_host} {challenge.target.target_port}</code>
                </div>
              )}
            </div>
          )}

          {/* Challenge Files Attachment */}
          {challenge.files && challenge.files.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                Challenge Artifacts
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {challenge.files.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => handleDownloadArtifact(file.id, file.file_path)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 text-xs font-mono text-slate-200 hover:text-cyan-400 transition-colors w-full text-left"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Download className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="truncate">{file.file_name}</span>
                    </div>
                    <span className="text-slate-500 text-[10px] ml-2">
                      {(file.file_size / 1024).toFixed(1)} KB
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hints Section */}
          {hints && hints.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Intelligence & Hints ({hints.length})</span>
                </h4>
                {hintError && (
                  <span className="text-xs text-rose-400 font-mono">{hintError}</span>
                )}
              </div>

              <div className="space-y-2">
                {hints.map((hint, index) => (
                  <div
                    key={hint.id}
                    className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {hint.is_unlocked ? (
                          <Unlock className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-bold text-slate-200">
                          {hint.title || `Hint #${index + 1}`}
                        </span>
                      </div>

                      {hint.is_unlocked ? (
                        <span className="text-emerald-400 text-[11px] font-semibold">
                          ✓ UNLOCKED
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUnlockHint(hint.id)}
                          disabled={unlockingHintId === hint.id}
                          className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-colors disabled:opacity-50"
                        >
                          {unlockingHintId === hint.id
                            ? 'UNLOCKING...'
                            : `UNLOCK (-${hint.cost} PTS)`}
                        </button>
                      )}
                    </div>

                    {hint.is_unlocked && hint.content && (
                      <p className="mt-2 pt-2 border-t border-slate-800/80 text-slate-300 font-sans text-sm">
                        {hint.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submission Result Box */}
          {submissionResult.status !== 'idle' && (
            <div
              className={`p-3.5 rounded-lg font-mono text-xs flex items-center gap-2.5 border ${
                submissionResult.status === 'correct'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : submissionResult.status === 'incorrect'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {submissionResult.status === 'correct' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{submissionResult.message}</span>
            </div>
          )}

          {/* Flag Submission Form */}
          <form onSubmit={handleFlagSubmit} className="pt-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
              Submit Captured Flag
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Flag className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  placeholder="CCCTF{y0ur_captur3d_fl4g_h3r3}"
                  disabled={submitting || challenge.is_solved}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 disabled:opacity-60 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !flag.trim() || challenge.is_solved}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-mono font-bold text-sm shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Terminal className="w-4 h-4 animate-spin" />
                    CHECKING...
                  </>
                ) : challenge.is_solved ? (
                  'SOLVED'
                ) : (
                  'SUBMIT FLAG'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
