import type { IntervalKind } from '@/lib/db/repositories/scheduled-jobs';

export interface NextRunInput {
  kind: IntervalKind;
  value: number;
  timeOfDay: string | null; // 'HH:MM' for days/weeks, null for minutes/hours
  weekday: number | null; // 0-6 for weeks, null otherwise
  from: Date;
}

/**
 * Compute the next time (unix ms) a job should fire, given the previous
 * fire time. The "previous" can be either the original creation `now` or
 * the result of the most recent `lastRunAt`. The function is pure and
 * operates in the local timezone because that's what users expect when
 * they type "every Monday at 09:00".
 */
export function nextRunAt(input: NextRunInput): number {
  switch (input.kind) {
    case 'minutes':
      return input.from.getTime() + input.value * 60_000;
    case 'hours':
      return input.from.getTime() + input.value * 3_600_000;
    case 'days':
      return nextDaily(input.from, input.value, input.timeOfDay);
    case 'weeks':
      return nextWeekly(input.from, input.value, input.timeOfDay, input.weekday);
  }
}

function nextDaily(from: Date, value: number, timeOfDay: string | null): number {
  if (!timeOfDay) {
    return from.getTime() + value * 86_400_000;
  }
  const [hh, mm] = parseHHMM(timeOfDay);
  const candidate = new Date(from);
  candidate.setHours(hh, mm, 0, 0);
  if (candidate.getTime() <= from.getTime()) {
    candidate.setDate(candidate.getDate() + value);
  }
  return candidate.getTime();
}

function nextWeekly(
  from: Date,
  value: number,
  timeOfDay: string | null,
  weekday: number | null,
): number {
  if (weekday == null) {
    return from.getTime() + value * 7 * 86_400_000;
  }
  const [hh, mm] = parseHHMM(timeOfDay ?? '00:00');
  const candidate = new Date(from);
  candidate.setHours(hh, mm, 0, 0);
  const daysAhead = (weekday - candidate.getDay() + 7) % 7;
  if (daysAhead === 0 && candidate.getTime() <= from.getTime()) {
    candidate.setDate(candidate.getDate() + 7);
  } else {
    candidate.setDate(candidate.getDate() + daysAhead);
  }
  if (value > 1) {
    candidate.setDate(candidate.getDate() + (value - 1) * 7);
  }
  return candidate.getTime();
}

function parseHHMM(s: string): [number, number] {
  const parts = s.split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1] ?? 0);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    throw new Error(`invalid time_of_day: ${s}`);
  }
  return [hh, mm];
}
