import { z } from 'zod';
import * as requests from '@/lib/db/repositories/requests';
import { createResourceRouter } from '@/lib/api/route-helpers';

const Patch = z.object({
  name: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional(),
  url: z.string().optional(),
  headers: z.string().optional(),
  queryParams: z.string().optional(),
  bodyKind: z.enum(['none', 'json', 'form', 'raw', 'binary']).optional(),
  body: z.string().nullable().optional(),
  authKind: z.enum(['none', 'bearer', 'basic', 'apikey']).optional(),
  authConfig: z.string().nullable().optional(),
  preScript: z.string().nullable().optional(),
  postScript: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const { GET, PATCH, DELETE } = createResourceRouter({
  repo: requests,
  patchSchema: Patch,
});
