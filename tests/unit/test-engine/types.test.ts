import { describe, it, expect } from 'vitest';
import { Assertion, AssertionArray } from '@/lib/test-engine/types';

describe('assertion schemas', () => {
  it('parses a status assertion', () => {
    expect(Assertion.parse({ type: 'status', expected: 200 }).type).toBe('status');
    expect(Assertion.parse({ type: 'status', expected: [200, 201] }).type).toBe('status');
  });
  it('parses a latency assertion', () => {
    const out = Assertion.parse({ type: 'latency', maxMs: 500 });
    expect(out.type).toBe('latency');
  });
  it('parses a header assertion with default ignoreCase', () => {
    const out = HeaderAssertion();
    function HeaderAssertion() {
      return Assertion.parse({
        type: 'header',
        name: 'content-type',
        match: 'equals',
        value: 'application/json',
      });
    }
    expect(out).toMatchObject({ type: 'header', ignoreCase: false });
  });
  it('parses a jsonpath assertion', () => {
    const out = Assertion.parse({ type: 'jsonpath', path: '$.user.id', op: 'exists' });
    expect(out.type).toBe('jsonpath');
  });
  it('parses a schema assertion', () => {
    const out = Assertion.parse({ type: 'schema', schema: { '$.id': 1 } });
    expect(out.type).toBe('schema');
  });
  it('parses a script assertion', () => {
    const out = Assertion.parse({ type: 'script', source: 'result.status === 200' });
    expect(out.type).toBe('script');
  });
  it('rejects unknown type', () => {
    expect(() => Assertion.parse({ type: 'whatever' })).toThrow();
  });
  it('parses an array of mixed assertions', () => {
    const out = AssertionArray.parse([
      { type: 'status', expected: 200 },
      { type: 'latency', maxMs: 500 },
      { type: 'jsonpath', path: '$.token', op: 'exists' },
    ]);
    expect(out.length).toBe(3);
  });
});
