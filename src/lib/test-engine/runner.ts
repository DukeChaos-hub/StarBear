import { sendRequest, type SendRequestInput } from '@/lib/http';
import { runAssertion } from './assertions';
import { AssertionArray, type Assertion, type AssertionOutcome } from './types';

export interface RunTestCaseInput extends Omit<
  SendRequestInput,
  'headers' | 'query' | 'body' | 'auth'
> {
  testCaseId: string;
  requestId: string;
  assertions: Assertion[];
  headers?: SendRequestInput['headers'];
  query?: SendRequestInput['query'];
  body?: string;
  auth?: SendRequestInput['auth'];
}

export interface RunTestCaseOutput {
  testCaseId: string;
  requestId: string;
  status: 'passed' | 'failed' | 'error';
  response?: Awaited<ReturnType<typeof sendRequest>>;
  assertionsResult: AssertionOutcome[];
  error?: string;
}

export async function runTestCase(input: RunTestCaseInput): Promise<RunTestCaseOutput> {
  const outcomes: AssertionOutcome[] = [];
  let response: Awaited<ReturnType<typeof sendRequest>> | undefined;
  try {
    response = await sendRequest({
      method: input.method,
      url: input.url,
      vars: input.vars,
      ssrfMode: input.ssrfMode,
      timeoutMs: input.timeoutMs,
      headers: input.headers,
      query: input.query,
      body: input.body,
      auth: input.auth,
    });
  } catch (e) {
    return {
      testCaseId: input.testCaseId,
      requestId: input.requestId,
      status: 'error',
      error: (e as Error).message,
      assertionsResult: [],
    };
  }
  for (const a of input.assertions) outcomes.push(runAssertion(a, response));
  const status = outcomes.every((o) => o.passed) ? 'passed' : 'failed';
  return {
    testCaseId: input.testCaseId,
    requestId: input.requestId,
    status,
    response,
    assertionsResult: outcomes,
  };
}

export function parseAssertionsJson(json: string): Assertion[] {
  return AssertionArray.parse(JSON.parse(json));
}
