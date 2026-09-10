import React from 'react';
import { Challenge } from '../../types';
import { DifficultyBadge, CategoryBadge } from '../common/Badges';
import { CheckCircle2, Flame, Users, FileCode } from 'lucide-react';
import { cn, formatPoints } from '../../lib/utils';

interface ChallengeCardProps {
  challenge: Challenge;
  onClick?: () => void;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-xl p-5 bg-[#090e1d] border transition-all duration-200 cursor-pointer flex flex-col justify-between',
        challenge.is_solved
          ? 'border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-500/70'
          : 'border-slate-800 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10'
      )}
    >
      {/* Solved Ribbon / Watermark */}
      {challenge.is_solved && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>SOLVED</span>
        </div>
      )}

      <div>
        {/* Header Badges */}
        <div className="flex items-center gap-2 mb-3">
          <CategoryBadge category={challenge.category?.name || challenge.challenge_type} />
          <DifficultyBadge difficulty={challenge.difficulty} />

          {challenge.first_blood_team && (
            <span
              title={`First Blood claimed by ${challenge.first_blood_team.name}`}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30 ml-auto"
            >
              <Flame className="w-3 h-3 fill-rose-400 text-rose-400" />
              <span>{challenge.first_blood_team.name}</span>
            </span>
          )}
        </div>

        {/* Challenge Name */}
        <h3 className="text-base font-mono font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1 mb-2">
          {challenge.name}
        </h3>

        {/* Short Description excerpt */}
        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed font-sans">
          {challenge.description}
        </p>
      </div>

      {/* Footer Metrics */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1" title="Solves count">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{challenge.solves_count} solves</span>
          </span>
          {challenge.files && challenge.files.length > 0 && (
            <span className="flex items-center gap-1" title="Files attached">
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>{challenge.files.length}</span>
            </span>
          )}
        </div>

        <div
          className="flex items-baseline gap-1 text-right"
          title={
            challenge.current_points && challenge.current_points !== challenge.base_points
              ? `Current Value: ${challenge.current_points} PTS (Base: ${challenge.base_points} PTS)`
              : `Base Points: ${challenge.base_points} PTS`
          }
        >
          <span className="text-base font-bold text-cyan-400 font-mono">
            {formatPoints(challenge.current_points || challenge.base_points)}
          </span>
          <span className="text-[10px] text-slate-500 uppercase">PTS</span>
        </div>
      </div>
    </div>
  );
};
