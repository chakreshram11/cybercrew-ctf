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
  const [timeLeft, setTimeLeft] = useState(() => formatTimeRemaining(targetDate));

  useEffect(() => {
    setTimeLeft(formatTimeRemaining(targetDate));

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

  if (!targetDate || isNaN(Date.parse(targetDate))) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-xs">
        <Clock className="w-4 h-4" />
        <span className="font-semibold tracking-wider">EVENT SCHEDULE UNAVAILABLE</span>
      </div>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-sm shadow-md">
        <Clock className="w-4 h-4 animate-pulse" />
        <span className="font-bold tracking-wider uppercase">COMPETITION LIVE</span>
      </div>
    );
  }

  const pad = (n: number) => String(isNaN(n) ? 0 : n).padStart(2, '0');

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="text-[11px] font-mono tracking-widest text-cyan-400/80 uppercase mb-1.5 font-bold">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1.5 font-mono text-slate-100">
        <div className="flex flex-col items-center px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg min-w-[44px]">
          <span className="text-lg font-bold text-cyan-400">{pad(timeLeft.days)}</span>
          <span className="text-[9px] text-slate-400 font-semibold">D</span>
        </div>
        <span className="text-cyan-400/60 font-bold text-lg">:</span>
        <div className="flex flex-col items-center px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg min-w-[44px]">
          <span className="text-lg font-bold text-cyan-400">{pad(timeLeft.hours)}</span>
          <span className="text-[9px] text-slate-400 font-semibold">H</span>
        </div>
        <span className="text-cyan-400/60 font-bold text-lg">:</span>
        <div className="flex flex-col items-center px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg min-w-[44px]">
          <span className="text-lg font-bold text-cyan-400">{pad(timeLeft.minutes)}</span>
          <span className="text-[9px] text-slate-400 font-semibold">M</span>
        </div>
        <span className="text-cyan-400/60 font-bold text-lg">:</span>
        <div className="flex flex-col items-center px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg min-w-[44px]">
          <span className="text-lg font-bold text-cyan-400 animate-pulse">{pad(timeLeft.seconds)}</span>
          <span className="text-[9px] text-slate-400 font-semibold">S</span>
        </div>
      </div>
    </div>
  );
};
