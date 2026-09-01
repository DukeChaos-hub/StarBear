import { describe, it, expect } from 'vitest';
import { encryptKey, decryptKey, ensureMasterKey } from '@/lib/ai/crypto';

describe('crypto', () => {
  it('round-trips a key with a fixed master', () => {
    const master = 'a'.repeat(64);
    const ct = encryptKey('sk-test-123', master);
    expect(ct).not.toBe('sk-test-123');
    expect(decryptKey(ct, master)).toBe('sk-test-123');
  });

  it('fails with the wrong master key', () => {
    const ct = encryptKey('sk', 'a'.repeat(64));
    expect(() => decryptKey(ct, 'b'.repeat(64))).toThrow();
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const master = 'a'.repeat(64);
    const a = encryptKey('same', master);
    const b = encryptKey('same', master);
    expect(a).not.toBe(b);
    expect(decryptKey(a, master)).toBe('same');
    expect(decryptKey(b, master)).toBe('same');
  });

  it('ensureMasterKey returns 64-char hex', () => {
    const k = ensureMasterKey();
    expect(k).toMatch(/^[0-9a-f]{64}$/);
  });

  it('respects STARBEAR_MASTER_KEY when set', () => {
    const original = process.env.STARBEAR_MASTER_KEY;
    process.env.STARBEAR_MASTER_KEY = 'f'.repeat(64);
    try {
      expect(ensureMasterKey()).toBe('f'.repeat(64));
    } finally {
      if (original === undefined) delete process.env.STARBEAR_MASTER_KEY;
      else process.env.STARBEAR_MASTER_KEY = original;
    }
  });
});
