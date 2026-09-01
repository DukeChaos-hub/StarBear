import { describe, it, expect } from 'vitest';
import { newId } from '@/lib/utils/nanoid-wrapper';

describe('newId', () => {
  it('returns a 21-character URL-safe string', () => {
    const id = newId();
    expect(id).toMatch(/^[A-Za-z0-9_-]{21}$/);
  });

  it('returns unique values', () => {
    const a = newId();
    const b = newId();
    expect(a).not.toBe(b);
  });
});
