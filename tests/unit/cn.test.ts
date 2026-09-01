import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils/cn';

describe('cn', () => {
  it('merges classes', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
  it('dedupes conflicting tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
  it('ignores falsy values', () => {
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b');
  });
});
