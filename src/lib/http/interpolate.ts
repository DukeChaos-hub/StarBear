const VAR_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

export class UnresolvedVariableError extends Error {
  constructor(public readonly variableName: string) {
    super(`Unresolved variable: ${variableName}`);
    this.name = 'UnresolvedVariableError';
  }
}

export function interpolate(input: string, vars: Record<string, string>): string {
  return input.replace(VAR_RE, (match, name: string) => {
    if (!(name in vars)) throw new UnresolvedVariableError(name);
    return vars[name]!;
  });
}

export function interpolateDeep(value: unknown, vars: Record<string, string>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return interpolate(value, vars);
  if (Array.isArray(value)) return value.map((v) => interpolateDeep(v, vars));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = interpolateDeep(v, vars);
    }
    return out;
  }
  return value;
}
