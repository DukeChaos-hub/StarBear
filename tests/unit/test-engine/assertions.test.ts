import { describe, it, expect } from 'vitest';
import { runAssertion } from '@/lib/test-engine/assertions';
import type { SendRequestResult } from '@/lib/http';

const base: SendRequestResult = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json', 'x-token': 'abc123' },
  body: JSON.stringify({ token: 'eyJ', user: { id: 1, name: 'Alice' } }),
  bodyJson: undefined,
  latencyMs: 42,
  size: 50,
};

describe('runAssertion', () => {
  it('status exact match', () => {
    expect(runAssertion({ type: 'status', expected: 200 }, base).passed).toBe(true);
    expect(runAssertion({ type: 'status', expected: 200 }, { ...base, status: 404 }).passed).toBe(false);
  });
  it('status one-of array', () => {
    expect(runAssertion({ type: 'status', expected: [200, 201] }, base).passed).toBe(true);
    expect(runAssertion({ type: 'status', expected: [201, 202] }, base).passed).toBe(false);
  });
  it('latency', () => {
    expect(runAssertion({ type: 'latency', maxMs: 100 }, base).passed).toBe(true);
    expect(runAssertion({ type: 'latency', maxMs: 10 }, base).passed).toBe(false);
  });
  it('header equals / contains / regex / missing', () => {
    expect(
      runAssertion({ type: 'header', name: 'x-token', match: 'equals', value: 'abc123', ignoreCase: false }, base)
        .passed,
    ).toBe(true);
    expect(
      runAssertion({ type: 'header', name: 'x-token', match: 'equals', value: 'X', ignoreCase: false }, base)
        .passed,
    ).toBe(false);
    expect(
      runAssertion({ type: 'header', name: 'x-token', match: 'contains', value: 'c1', ignoreCase: false }, base)
        .passed,
    ).toBe(true);
    expect(
      runAssertion({ type: 'header', name: 'x-token', match: 'regex', value: '^a.c', ignoreCase: false }, base)
        .passed,
    ).toBe(true);
    expect(
      runAssertion({ type: 'header', name: 'missing', match: 'equals', value: 'x', ignoreCase: false }, base)
        .passed,
    ).toBe(false);
  });
  it('jsonpath exists / equals / notExists / contains / regex', () => {
    expect(runAssertion({ type: 'jsonpath', path: '$.user.id', op: 'exists' }, base).passed).toBe(true);
    expect(runAssertion({ type: 'jsonpath', path: '$.user.email', op: 'exists' }, base).passed).toBe(false);
    expect(runAssertion({ type: 'jsonpath', path: '$.user.name', op: 'equals', value: 'Alice' }, base).passed).toBe(true);
    expect(runAssertion({ type: 'jsonpath', path: '$.user.name', op: 'notEquals', value: 'Bob' }, base).passed).toBe(true);
    expect(
      runAssertion({ type: 'jsonpath', path: '$.user.name', op: 'contains', value: 'lic' }, base).passed,
    ).toBe(true);
    expect(
      runAssertion({ type: 'jsonpath', path: '$.user.name', op: 'regex', value: '^Al' }, base).passed,
    ).toBe(true);
    expect(runAssertion({ type: 'jsonpath', path: '$.user.email', op: 'notExists' }, base).passed).toBe(true);
  });
  it('schema matches when path values equal expected', () => {
    const out = runAssertion({ type: 'schema', schema: { '$.user.id': 1, '$.user.name': 'Alice' } }, base);
    expect(out.passed).toBe(true);
  });
  it('schema fails on any mismatch', () => {
    const out = runAssertion({ type: 'schema', schema: { '$.user.id': 2 } }, base);
    expect(out.passed).toBe(false);
  });
  it('script: truthy expression passes', () => {
    expect(runAssertion({ type: 'script', source: 'result.status === 200' }, base).passed).toBe(true);
    expect(runAssertion({ type: 'script', source: 'result.status === 500' }, base).passed).toBe(false);
  });
  it('script: thrown error fails the assertion, not the test', () => {
    const out = runAssertion({ type: 'script', source: 'throw new Error("nope")' }, base);
    expect(out.passed).toBe(false);
    expect(out.message).toMatch(/script error/);
  });
  it('jsonpath on non-JSON body returns null passed for exists=false', () => {
    const txt: SendRequestResult = { ...base, body: 'not json', bodyJson: undefined };
    const out = runAssertion({ type: 'jsonpath', path: '$.foo', op: 'exists' }, txt);
    expect(out.passed).toBe(false);
  });
});
