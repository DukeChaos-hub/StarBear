import type { Assertion, AssertionOutcome } from './types';
import type { SendRequestResult } from '@/lib/http';

function getByPath(obj: unknown, path: string): unknown {
  if (!path.startsWith('$')) return undefined;
  const tokens = path
    .slice(1)
    .split(/[.[\]]+/)
    .filter(Boolean);
  let cur: unknown = obj;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(t);
      if (Number.isNaN(idx)) return undefined;
      cur = cur[idx];
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[t];
    } else return undefined;
  }
  return cur;
}

export function runAssertion(a: Assertion, result: SendRequestResult): AssertionOutcome {
  switch (a.type) {
    case 'status': {
      const expected = Array.isArray(a.expected) ? a.expected : [a.expected];
      const ok = expected.includes(result.status);
      return {
        type: a.type,
        passed: ok,
        message: `status ${result.status} ${ok ? 'in' : 'not in'} [${expected.join(', ')}]`,
      };
    }
    case 'latency': {
      const ok = result.latencyMs <= a.maxMs;
      return {
        type: a.type,
        passed: ok,
        message: `latency ${result.latencyMs}ms ${ok ? '<=' : '>'} ${a.maxMs}ms`,
      };
    }
    case 'header': {
      const got = result.headers[a.name.toLowerCase()];
      if (got === undefined) {
        return { type: a.type, passed: false, message: `header ${a.name} missing` };
      }
      const haystack = a.ignoreCase ? got.toLowerCase() : got;
      const needle = a.ignoreCase ? a.value.toLowerCase() : a.value;
      let ok = false;
      if (a.match === 'equals') ok = haystack === needle;
      else if (a.match === 'contains') ok = haystack.includes(needle);
      else ok = new RegExp(a.value, a.ignoreCase ? 'i' : '').test(got);
      return {
        type: a.type,
        passed: ok,
        message: `header ${a.name} ${a.match} ${ok ? 'passed' : 'failed'}`,
      };
    }
    case 'jsonpath': {
      const json = result.bodyJson ?? safeJson(result.body);
      const got = getByPath(json, a.path);
      switch (a.op) {
        case 'exists':
          return {
            type: a.type,
            passed: got !== undefined && got !== null,
            message: `jsonpath ${a.path} exists`,
          };
        case 'notExists':
          return {
            type: a.type,
            passed: got === undefined || got === null,
            message: `jsonpath ${a.path} notExists`,
          };
        case 'equals':
          return {
            type: a.type,
            passed: JSON.stringify(got) === JSON.stringify(a.value),
            message: `jsonpath ${a.path} equals ${JSON.stringify(a.value)}`,
          };
        case 'notEquals':
          return {
            type: a.type,
            passed: JSON.stringify(got) !== JSON.stringify(a.value),
            message: `jsonpath ${a.path} notEquals`,
          };
        case 'contains':
          return {
            type: a.type,
            passed: typeof got === 'string' && got.includes(String(a.value)),
            message: `jsonpath ${a.path} contains`,
          };
        case 'regex':
          try {
            return {
              type: a.type,
              passed: new RegExp(String(a.value)).test(String(got)),
              message: `jsonpath ${a.path} regex`,
            };
          } catch {
            return { type: a.type, passed: false, message: `jsonpath ${a.path} regex: invalid` };
          }
      }
    }
    case 'schema': {
      const json = result.bodyJson ?? safeJson(result.body);
      const mismatches: string[] = [];
      for (const [k, v] of Object.entries(a.schema)) {
        const got = getByPath(json, k);
        if (JSON.stringify(got) !== JSON.stringify(v)) mismatches.push(k);
      }
      return {
        type: a.type,
        passed: mismatches.length === 0,
        message: mismatches.length === 0 ? 'schema ok' : `mismatch: ${mismatches.join(', ')}`,
      };
    }
    case 'script': {
      // v1 sandbox: a single expression evaluated with `result` in scope.
      // No network. No process access. No globals beyond `result`.
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('result', `return (${a.source});`);
        const out = fn(result);
        return { type: a.type, passed: !!out, message: `script ${!!out ? 'passed' : 'failed'}` };
      } catch (e) {
        return { type: a.type, passed: false, message: `script error: ${(e as Error).message}` };
      }
    }
  }
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
