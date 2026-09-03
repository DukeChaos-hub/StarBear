export interface ScheduledJob {
  id: string;
  name: string;
  testCaseIds: string[];
  intervalKind: 'minutes' | 'hours' | 'days' | 'weeks';
  intervalValue: number;
  timeOfDay: string | null;
  weekday: number | null;
  enabled: number;
  next_run_at: number;
  last_run_at: number | null;
  last_run_id: string | null;
}
