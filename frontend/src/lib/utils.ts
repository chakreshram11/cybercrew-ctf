import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat().format(points);
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

export function formatTimeRemaining(targetDate: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const total = Date.parse(targetDate) - Date.now();
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, isExpired: false };
}

export function parseIsoToUtcDateAndTime(isoString?: string | null): { date: string; time: string } {
  if (!isoString) return { date: '', time: '' };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: '', time: '' };
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
  } catch {
    return { date: '', time: '' };
  }
}

export function combineUtcDateAndTimeToIso(dateStr: string, timeStr: string): string {
  if (!dateStr || !timeStr) return '';
  const cleanDate = dateStr.trim();
  let cleanTime = timeStr.trim();
  if (/^\d{1,2}:\d{2}$/.test(cleanTime)) {
    const [h, m] = cleanTime.split(':');
    cleanTime = `${h.padStart(2, '0')}:${m}:00`;
  } else if (/^\d{1,2}:\d{2}:\d{2}$/.test(cleanTime)) {
    const [h, m, s] = cleanTime.split(':');
    cleanTime = `${h.padStart(2, '0')}:${m}:${s}`;
  }
  return `${cleanDate}T${cleanTime}Z`;
}
