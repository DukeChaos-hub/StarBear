import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate, closeDb } from '@/lib/db/client';
import * as collections from '@/lib/db/repositories/collections';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'starbear-col-edge-'));
  process.env.STARBEAR_DB = join(dir, 'test.sqlite');
  closeDb();
  migrate();
});
afterAll(() => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe('collections.update — every branch', () => {
  it('updates only parentId', async () => {
    const id = await collections.create({
      name: 'A',
      description: null,
      parentId: null,
      sortOrder: 0,
    });
    await collections.update(id, { parentId: 'parent-1' });
    const after = await collections.getById(id);
    expect(after?.parent_id).toBe('parent-1');
    expect(after?.name).toBe('A');
  });

  it('updates only sortOrder', async () => {
    const id = await collections.create({
      name: 'A',
      description: null,
      parentId: null,
      sortOrder: 0,
    });
    await collections.update(id, { sortOrder: 42 });
    const after = await collections.getById(id);
    expect(after?.sort_order).toBe(42);
  });

  it('no-op when patch is empty', async () => {
    const id = await collections.create({
      name: 'A',
      description: 'keep me',
      parentId: null,
      sortOrder: 7,
    });
    const before = await collections.getById(id);
    await collections.update(id, {});
    const after = await collections.getById(id);
    // updated_at should not have been bumped.
    expect(after?.updated_at).toBe(before?.updated_at);
  });
});
