import { describe, it, expect } from 'vitest';
import { interpolate, UnresolvedVariableError } from '@/lib/http/interpolate';

describe('interpolate', () => {
  it('replaces a single variable', () => {
    expect(interpolate('hello {{name}}', { name: 'world' })).toBe('hello world');
  });

  it('replaces multiple variables', () => {
    expect(interpolate('{{a}}/{{b}}', { a: 'x', b: 'y' })).toBe('x/y');
  });

  it('leaves text without variables unchanged', () => {
    expect(interpolate('plain', { a: 'x' })).toBe('plain');
  });

  it('throws UnresolvedVariableError for missing keys', () => {
    expect(() => interpolate('{{missing}}', {})).toThrow(UnresolvedVariableError);
  });

  it('allows underscores and digits in names', () => {
    expect(interpolate('{{user_id_2}}', { user_id_2: '42' })).toBe('42');
  });

  it('returns empty string for empty input', () => {
    expect(interpolate('', { a: '1' })).toBe('');
  });
});
