import React from 'react';
import { ChallengeDifficulty, ChallengeStatus, ChallengeType } from '../../types';
import { cn } from '../../lib/utils';

export const DifficultyBadge: React.FC<{ difficulty: ChallengeDifficulty; className?: string }> = ({
  difficulty,
  className,
}) => {
  const styles: Record<ChallengeDifficulty, string> = {
    EASY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    HARD: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    EXPERT: 'bg-purple-500/10 text-purple-400 border-purple-500/30 animate-pulse',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-semibold border tracking-wider uppercase',
        styles[difficulty] || styles.MEDIUM,
        className
      )}
    >
      {difficulty}
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: string | ChallengeType; className?: string }> = ({
  category,
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase tracking-wide',
        className
      )}
    >
      {category}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: ChallengeStatus; className?: string }> = ({
  status,
  className,
}) => {
  const styles: Record<ChallengeStatus, string> = {
    DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    IN_REVIEW: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    APPROVED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    PUBLISHED: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    DISABLED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    ARCHIVED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold border uppercase tracking-wider',
        styles[status] || styles.DRAFT,
        className
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
};
