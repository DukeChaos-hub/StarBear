/**
 * Formatting helpers for the schedules UI. Kept in a sibling module so
 * both the list and the detail page can re-use them without duplicating
 * the day-of-week / interval-string logic.
 */
import type { ScheduledJob } from './_types';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function formatSchedule(job: ScheduledJob): string {
  const v = job.intervalValue;
  const tod = job.timeOfDay ? ` at ${job.timeOfDay}` : '';
  switch (job.intervalKind) {
    case 'minutes':
      return v === 1 ? 'every minute' : `every ${v} minutes`;
    case 'hours':
      return v === 1 ? 'every hour' : `every ${v} hours`;
    case 'days':
      return v === 1 ? `daily${tod}` : `every ${v} days${tod}`;
    case 'weeks': {
      const wd =
        job.weekday != null ? WEEKDAY_LABELS[job.weekday] : '?';
      return v === 1 ? `weekly on ${wd}${tod}` : `every ${v} weeks on ${wd}${tod}`;
    }
  }
}

export function formatRelative(ts: number, now: number): string {
  const diff = ts - now;
  const absSec = Math.round(Math.abs(diff) / 1000);
  const sign = diff < 0 ? 'ago' : 'from now';
  if (absSec < 60) return diff < 0 ? 'just now' : `in ${absSec}s`;
  if (absSec < 3600) {
    const m = Math.round(absSec / 60);
    return diff < 0 ? `${m}m ${sign}` : `in ${m}m`;
  }
  if (absSec < 86_400) {
    const h = Math.round(absSec / 3600);
    return diff < 0 ? `${h}h ${sign}` : `in ${h}h`;
  }
  const d = Math.round(absSec / 86_400);
  return diff < 0 ? `${d}d ${sign}` : `in ${d}d`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}
