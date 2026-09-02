import { z } from 'zod';
import * as cases from '@/lib/db/repositories/test-cases';
import { createResourceRouter } from '@/lib/api/route-helpers';

const Patch = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  assertions: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const { GET, PATCH, DELETE } = createResourceRouter({
  repo: cases,
  patchSchema: Patch,
});
