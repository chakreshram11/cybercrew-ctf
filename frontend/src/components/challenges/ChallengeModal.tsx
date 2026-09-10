import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Challenge, ChallengeHint } from '../../types';
import { DifficultyBadge, CategoryBadge } from '../common/Badges';
import {
  X,
  Flag,
  Download,
  Terminal,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  ExternalLink,
  Flame,
  Users,
  Lightbulb,
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

  const [unlockingHintId, setUnlockingHintId] = useState<string | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);

  // Fetch participant-facing hints for this challenge
  const {
    data: fetchedHints,
    isLoading: isHintsLoading,
    refetch: refetchHints,
  } = useQuery({
    queryKey: ['challenge-hints', challenge.id],
    queryFn: async () => {
      const res = await api.get<ChallengeHint[]>(`/challenges/${challenge.id}/hints`);
      return res.success && res.data ? res.data : [];
    },
    enabled: isOpen && !!challenge.id,
  });

  const hints = fetchedHints || challenge.hints || [];

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
        already_unlocked?: boolean;
      }>(`/challenges/${challenge.id}/hints/${hintId}/reveal`);

      if (res.success && res.data) {
        refetchHints();
        queryClient.invalidateQueries({ queryKey: ['team-progress'] });
        queryClient.invalidateQueries({ queryKey: ['scoreboard'] });
        queryClient.invalidateQueries({ queryKey: ['challenges'] });
        queryClient.invalidateQueries({ queryKey: ['team-score-history'] });
        await refreshProfile();
      } else {
        const msg = res.error?.message || 'Failed to reveal hint.';
        if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('points')) {
          setHintError('Not enough points to reveal this hint.');
        } else {
          setHintError(msg);
        }
      }
    } catch {
      setHintError('Network error while revealing hint.');
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
              <span
                title={
                  challenge.current_points && challenge.current_points !== challenge.base_points
                    ? `Current Value: ${challenge.current_points} PTS (Base: ${challenge.base_points} PTS)`
                    : `Base Points: ${challenge.base_points} PTS`
                }
                className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30"
              >
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

          {/* Paid Hints Section */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>HINTS</span>
                </h4>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Need a little help? Reveal a hint by spending points.
                </p>
              </div>
              {hintError && (
                <span className="text-xs text-rose-400 font-mono bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                  {hintError}
                </span>
              )}
            </div>

            {isHintsLoading ? (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center font-mono text-xs text-slate-500">
                LOADING HINT CATALOG...
              </div>
            ) : hints.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center font-mono text-xs text-slate-500">
                No hints are available for this challenge.
              </div>
            ) : (
              <div className="space-y-2.5">
                {hints.map((hint, index) => (
                  <div
                    key={hint.id}
                    className={`p-4 rounded-xl border transition-all font-mono text-xs ${
                      hint.is_unlocked
                        ? 'bg-emerald-950/10 border-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {hint.is_unlocked ? (
                          <Unlock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        )}
                        <div>
                          <span className="font-bold text-slate-200 block text-xs">
                            {hint.title || `Hint #${index + 1}`}
                          </span>
                          <span className="text-[10px] text-amber-400/90">
                            {hint.cost > 0 ? `${hint.cost} PTS` : 'FREE'}
                          </span>
                        </div>
                      </div>

                      <div>
                        {hint.is_unlocked ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>REVEALED</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUnlockHint(hint.id)}
                            disabled={unlockingHintId === hint.id}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-all disabled:opacity-50 hover:scale-[1.02] shadow-sm shadow-amber-500/10 flex items-center gap-1.5"
                          >
                            {unlockingHintId === hint.id ? (
                              <>
                                <Terminal className="w-3.5 h-3.5 animate-spin" />
                                <span>REVEALING...</span>
                              </>
                            ) : (
                              <span>REVEAL HINT (-{hint.cost} PTS)</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {hint.is_unlocked && hint.content && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 text-slate-300 font-sans text-sm leading-relaxed whitespace-pre-line bg-slate-950/60 p-3 rounded-lg border border-emerald-500/20">
                        {hint.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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
