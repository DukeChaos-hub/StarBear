import { z } from 'zod';
import * as vars from '@/lib/db/repositories/env-variables';
import { createResourceRouter } from '@/lib/api/route-helpers';

const Patch = z.object({
  key: z.string().optional(),
  value: z.string().optional(),
  isSecret: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const { PATCH, DELETE } = createResourceRouter({
  repo: vars,
  patchSchema: Patch,
  includeGet: false,
});
