import { describe, expect, it } from 'vitest';
import { nextRunAt } from '@/lib/scheduler';

function localDate(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(y, m - 1, d, h, min, 0, 0);
}

// Day-of-week for the dates used in the tests (sanity check on the local TZ):
//   Sep 1  2026 = Tue   (Sep 7 = Mon, Sep 4 = Fri, Sep 6 = Sun, Sep 2 = Wed)

describe('nextRunAt - minutes', () => {
  it('every 5 minutes from a base time', () => {
    const from = localDate(2026, 9, 1, 12, 0);
    const next = nextRunAt({ kind: 'minutes', value: 5, timeOfDay: null, weekday: null, from });
    expect(next).toBe(localDate(2026, 9, 1, 12, 5).getTime());
  });

  it('every 1 minute is exact', () => {
    const from = localDate(2026, 9, 1, 12, 30);
    const next = nextRunAt({ kind: 'minutes', value: 1, timeOfDay: null, weekday: null, from });
    expect(next).toBe(from.getTime() + 60_000);
  });

  it('60 minutes = one hour forward', () => {
    const from = localDate(2026, 9, 1, 8, 0);
    const next = nextRunAt({ kind: 'minutes', value: 60, timeOfDay: null, weekday: null, from });
    expect(next).toBe(localDate(2026, 9, 1, 9, 0).getTime());
  });
});

describe('nextRunAt - hours', () => {
  it('every 2 hours from a base time', () => {
    const from = localDate(2026, 9, 1, 10, 0);
    const next = nextRunAt({ kind: 'hours', value: 2, timeOfDay: null, weekday: null, from });
    expect(next).toBe(localDate(2026, 9, 1, 12, 0).getTime());
  });

  it('every 24 hours is one full day', () => {
    const from = localDate(2026, 9, 1, 10, 30);
    const next = nextRunAt({ kind: 'hours', value: 24, timeOfDay: null, weekday: null, from });
    expect(next).toBe(localDate(2026, 9, 2, 10, 30).getTime());
  });
});

describe('nextRunAt - days at HH:MM', () => {
  it('slot is in the future today, return today', () => {
    const from = localDate(2026, 9, 1, 8, 0); // Tue 08:00
    const next = nextRunAt({ kind: 'days', value: 1, timeOfDay: '09:00', weekday: null, from });
    expect(next).toBe(localDate(2026, 9, 1, 9, 0).getTime());
  });

  it('slot has passed today, return tomorrow', () => {
    const from = localDate(2026, 9, 1, 10, 0);
    const next = nextRunAt({ kind: 'days', value: 1, timeOfDay: '09:00', weekday: null, from });
    expect(next).toBe(localDate(2026, 9, 2, 9, 0).getTime());
  });

  it('slot is exactly now, treat as past and advance', () => {
    const from = localDate(2026, 9, 1, 9, 0);
    const next = nextRunAt({ kind: 'days', value: 1, timeOfDay: '09:00', weekday: null, from });
    expect(next).toBe(localDate(2026, 9, 2, 9, 0).getTime());
  });

  it('every 2 days at HH:MM rolls forward 2 days when slot has passed', () => {
    const from = localDate(2026, 9, 1, 10, 0);
    const next = nextRunAt({ kind: 'days', value: 2, timeOfDay: '09:00', weekday: null, from });
    expect(next).toBe(localDate(2026, 9, 3, 9, 0).getTime());
  });

  it('every 2 days at HH:MM uses today when slot is in the future', () => {
    const from = localDate(2026, 9, 1, 8, 0);
    const next = nextRunAt({ kind: 'days', value: 2, timeOfDay: '09:00', weekday: null, from });
    expect(next).toBe(localDate(2026, 9, 1, 9, 0).getTime());
  });

  it('minutes in the slot are respected', () => {
    const from = localDate(2026, 9, 1, 8, 0);
    const next = nextRunAt({ kind: 'days', value: 1, timeOfDay: '14:30', weekday: null, from });
    expect(next).toBe(localDate(2026, 9, 1, 14, 30).getTime());
  });

  it('crosses month boundary', () => {
    const from = localDate(2026, 9, 30, 12, 0); // Sep 30 noon
    const next = nextRunAt({ kind: 'days', value: 1, timeOfDay: '09:00', weekday: null, from });
    expect(next).toBe(localDate(2026, 10, 1, 9, 0).getTime());
  });
});

describe('nextRunAt - weeks on weekday at HH:MM', () => {
  it('Wed 10:00 looking for Fri 10:00 -> 2 days later', () => {
    const from = localDate(2026, 9, 2, 10, 0); // Wed Sep 2 10:00
    const next = nextRunAt({
      kind: 'weeks',
      value: 1,
      timeOfDay: '10:00',
      weekday: 5, // Friday
      from,
    });
    expect(next).toBe(localDate(2026, 9, 4, 10, 0).getTime());
  });

  it('Mon 08:00 looking for Mon 09:00 -> same day 1 hour later', () => {
    const from = localDate(2026, 9, 7, 8, 0); // Mon Sep 7 08:00
    const next = nextRunAt({
      kind: 'weeks',
      value: 1,
      timeOfDay: '09:00',
      weekday: 1, // Monday
      from,
    });
    expect(next).toBe(localDate(2026, 9, 7, 9, 0).getTime());
  });

  it('Mon 10:00 looking for Mon 09:00 -> next Monday', () => {
    const from = localDate(2026, 9, 7, 10, 0); // Mon Sep 7 10:00
    const next = nextRunAt({
      kind: 'weeks',
      value: 1,
      timeOfDay: '09:00',
      weekday: 1,
      from,
    });
    expect(next).toBe(localDate(2026, 9, 14, 9, 0).getTime());
  });

  it('Sun looking for Mon -> next day', () => {
    const from = localDate(2026, 9, 6, 10, 0); // Sun Sep 6 10:00
    const next = nextRunAt({
      kind: 'weeks',
      value: 1,
      timeOfDay: '10:00',
      weekday: 1,
      from,
    });
    expect(next).toBe(localDate(2026, 9, 7, 10, 0).getTime());
  });

  it('every 2 weeks: from a Friday 10:00 -> 14 days later', () => {
    const from = localDate(2026, 9, 4, 10, 0); // Fri Sep 4 10:00
    const next = nextRunAt({
      kind: 'weeks',
      value: 2,
      timeOfDay: '10:00',
      weekday: 5,
      from,
    });
    expect(next).toBe(localDate(2026, 9, 18, 10, 0).getTime());
  });

  it('wrap-around weekday (looking for Sun from Wed)', () => {
    const from = localDate(2026, 9, 2, 10, 0); // Wed Sep 2
    const next = nextRunAt({
      kind: 'weeks',
      value: 1,
      timeOfDay: '10:00',
      weekday: 0, // Sun
      from,
    });
    expect(next).toBe(localDate(2026, 9, 6, 10, 0).getTime());
  });
});

describe('nextRunAt - error handling', () => {
  it('throws on malformed time_of_day', () => {
    const from = localDate(2026, 9, 1, 8, 0);
    expect(() =>
      nextRunAt({ kind: 'days', value: 1, timeOfDay: 'bad', weekday: null, from }),
    ).toThrow();
  });

  it('throws on out-of-range hour', () => {
    const from = localDate(2026, 9, 1, 8, 0);
    expect(() =>
      nextRunAt({ kind: 'days', value: 1, timeOfDay: '25:00', weekday: null, from }),
    ).toThrow();
  });
});
