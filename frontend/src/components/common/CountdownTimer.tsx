import React, { useEffect, useState } from 'react';
import { formatTimeRemaining } from '../../lib/utils';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string;
  label?: string;
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  label = 'TIME REMAINING',
  onExpire,
}) => {
  const [timeLeft, setTimeLeft] = useState(formatTimeRemaining(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = formatTimeRemaining(targetDate);
      setTimeLeft(remaining);
      if (remaining.isExpired) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-sm">
        <Clock className="w-4 h-4" />
        <span className="font-semibold tracking-wider">EVENT CONCLUDED</span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-[11px] font-mono tracking-widest text-cyan-400/70 uppercase mb-1">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1.5 font-mono text-slate-100">
        <div className="flex flex-col items-center px-2 py-1 bg-slate-900/80 border border-slate-800 rounded min-w-[40px]">
          <span className="text-base font-bold text-cyan-400">{pad(timeLeft.days)}</span>
          <span className="text-[9px] text-slate-400">D</span>
        </div>
        <span className="text-cyan-400/60 font-bold">:</span>
        <div className="flex flex-col items-center px-2 py-1 bg-slate-900/80 border border-slate-800 rounded min-w-[40px]">
          <span className="text-base font-bold text-cyan-400">{pad(timeLeft.hours)}</span>
          <span className="text-[9px] text-slate-400">H</span>
        </div>
        <span className="text-cyan-400/60 font-bold">:</span>
        <div className="flex flex-col items-center px-2 py-1 bg-slate-900/80 border border-slate-800 rounded min-w-[40px]">
          <span className="text-base font-bold text-cyan-400">{pad(timeLeft.minutes)}</span>
          <span className="text-[9px] text-slate-400">M</span>
        </div>
        <span className="text-cyan-400/60 font-bold">:</span>
        <div className="flex flex-col items-center px-2 py-1 bg-slate-900/80 border border-slate-800 rounded min-w-[40px]">
          <span className="text-base font-bold text-cyan-400 animate-pulse">{pad(timeLeft.seconds)}</span>
          <span className="text-[9px] text-slate-400">S</span>
        </div>
      </div>
    </div>
  );
};
