// Stub for Phase 1. Full DB-backed implementation arrives in Phase 2/5.
export interface AiSettings {
  ssrfMode: 'strict' | 'allow-local';
  activeProvider: string | null;
}

const DEFAULT: AiSettings = { ssrfMode: 'strict', activeProvider: null };

export async function getSettings(): Promise<AiSettings> {
  return DEFAULT;
}
