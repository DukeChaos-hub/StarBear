import { describe, it, expect } from 'vitest';
import { interpolateDeep, UnresolvedVariableError } from '@/lib/http/interpolate';

describe('interpolateDeep', () => {
  it('interpolates strings inside objects', () => {
    const out = interpolateDeep(
      { url: 'https://{{host}}/x', n: 1, ok: true },
      { host: 'api.test' },
    );
    expect(out).toEqual({ url: 'https://api.test/x', n: 1, ok: true });
  });

  it('interpolates strings inside arrays', () => {
    const out = interpolateDeep(['{{a}}', '{{b}}'], { a: '1', b: '2' });
    expect(out).toEqual(['1', '2']);
  });

  it('passes through null and undefined', () => {
    expect(interpolateDeep(null, {})).toBeNull();
    expect(interpolateDeep(undefined, {})).toBeUndefined();
  });

  it('throws on missing variable in nested object', () => {
    expect(() => interpolateDeep({ a: { b: '{{x}}' } }, {})).toThrow(UnresolvedVariableError);
  });
});
