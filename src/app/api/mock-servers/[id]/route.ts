import { z } from 'zod';
import * as servers from '@/lib/db/repositories/mock-servers';
import { createResourceRouter } from '@/lib/api/route-helpers';

const Patch = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  basePath: z.string().min(1).regex(/^\//).optional(),
  status: z.enum(['active', 'paused']).optional(),
});

export const { GET, PATCH, DELETE } = createResourceRouter({
  repo: servers,
  patchSchema: Patch,
});
