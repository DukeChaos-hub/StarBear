import * as envs from '@/lib/db/repositories/environments';
import { createResourceRouter } from '@/lib/api/route-helpers';
import { z } from 'zod';

const Patch = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const { PATCH, DELETE } = createResourceRouter({
  repo: envs,
  patchSchema: Patch,
  includeGet: false,
});
