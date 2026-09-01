import { z } from 'zod';

export const StatusAssertion = z.object({
  type: z.literal('status'),
  expected: z.union([z.number().int(), z.array(z.number().int())]),
});
export type StatusAssertion = z.infer<typeof StatusAssertion>;

export const LatencyAssertion = z.object({
  type: z.literal('latency'),
  maxMs: z.number().int().positive(),
});
export type LatencyAssertion = z.infer<typeof LatencyAssertion>;

export const HeaderAssertion = z.object({
  type: z.literal('header'),
  name: z.string().min(1),
  match: z.enum(['equals', 'contains', 'regex']),
  value: z.string(),
  ignoreCase: z.boolean().default(false),
});
export type HeaderAssertion = z.infer<typeof HeaderAssertion>;

export const JsonPathAssertion = z.object({
  type: z.literal('jsonpath'),
  path: z.string().min(1),
  op: z.enum(['equals', 'notEquals', 'contains', 'regex', 'exists', 'notExists']),
  value: z.unknown().optional(),
});
export type JsonPathAssertion = z.infer<typeof JsonPathAssertion>;

export const SchemaAssertion = z.object({
  type: z.literal('schema'),
  schema: z.record(z.string(), z.unknown()),
});
export type SchemaAssertion = z.infer<typeof SchemaAssertion>;

export const ScriptAssertion = z.object({
  type: z.literal('script'),
  source: z.string().min(1),
});
export type ScriptAssertion = z.infer<typeof ScriptAssertion>;

export const Assertion = z.discriminatedUnion('type', [
  StatusAssertion,
  LatencyAssertion,
  HeaderAssertion,
  JsonPathAssertion,
  SchemaAssertion,
  ScriptAssertion,
]);
export type Assertion = z.infer<typeof Assertion>;

export const AssertionArray = z.array(Assertion);

export interface AssertionOutcome {
  type: Assertion['type'];
  passed: boolean;
  message: string;
}
