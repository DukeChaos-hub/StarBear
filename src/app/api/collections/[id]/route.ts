import { z } from 'zod';
import * as collections from '@/lib/db/repositories/collections';
import { createResourceRouter } from '@/lib/api/route-helpers';

const Patch = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const { GET, PATCH, DELETE } = createResourceRouter({
  repo: collections,
  patchSchema: Patch,
});
