import { z } from 'zod';
import * as responses from '@/lib/db/repositories/mock-responses';
import { createResourceRouter } from '@/lib/api/route-helpers';

const Patch = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional(),
  pathPattern: z.string().min(1).regex(/^\//).optional(),
  status: z.number().int().min(100).max(599).optional(),
  headers: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  delayMs: z.number().int().min(0).max(60_000).optional(),
  sortOrder: z.number().int().optional(),
});

export const { GET, PATCH, DELETE } = createResourceRouter({
  repo: responses,
  patchSchema: Patch,
  idParam: 'rid',
});
