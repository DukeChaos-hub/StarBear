import { z } from 'zod';

export const IntervalKindZ = z.enum(['minutes', 'hours', 'days', 'weeks']);

const ScheduledJobBaseZ = z.object({
  name: z.string().min(1).max(120),
  testCaseIds: z.array(z.string().min(1)).min(1).max(500),
  intervalKind: IntervalKindZ,
  intervalValue: z.number().int().min(1).max(60),
  timeOfDay: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time_of_day must be HH:MM (24h)')
    .nullable()
    .default(null),
  weekday: z.number().int().min(0).max(6).nullable().default(null),
  enabled: z.boolean().default(true),
});

/**
 * Validation shape for a single scheduled job. Used by both the create
 * endpoint and the test-engine (the scheduler tick reuses the same
 * constraints so what users can create matches what gets executed).
 */
export const ScheduledJobInputZ = ScheduledJobBaseZ.superRefine((data, ctx) => {
  if (data.intervalKind === 'days' && !data.timeOfDay) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['timeOfDay'],
      message: 'time_of_day is required when intervalKind is "days"',
    });
  }
  if (data.intervalKind === 'weeks') {
    if (data.weekday == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weekday'],
        message: 'weekday is required when intervalKind is "weeks"',
      });
    }
    if (!data.timeOfDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['timeOfDay'],
        message: 'time_of_day is required when intervalKind is "weeks"',
      });
    }
  }
});

export type ScheduledJobInputT = z.infer<typeof ScheduledJobInputZ>;

/**
 * The subset of fields a PATCH can change. `testCaseIds`, `enabled`,
 * and the interval knobs are all updatable, but `id` and the
 * timestamps are not.
 */
export const ScheduledJobPatchZ = ScheduledJobBaseZ.partial().superRefine((data, ctx) => {
  // Only validate cross-field rules when the relevant fields are set.
  if (data.intervalKind === 'days' && data.timeOfDay === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['timeOfDay'],
      message: 'time_of_day is required when intervalKind is "days"',
    });
  }
  if (data.intervalKind === 'weeks') {
    if (data.weekday === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weekday'],
        message: 'weekday is required when intervalKind is "weeks"',
      });
    }
    if (data.timeOfDay === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['timeOfDay'],
        message: 'time_of_day is required when intervalKind is "weeks"',
      });
    }
  }
});
export type ScheduledJobPatchT = z.infer<typeof ScheduledJobPatchZ>;
