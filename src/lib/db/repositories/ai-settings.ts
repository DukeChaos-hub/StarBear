import { get as dbGet, run } from '../client';
import type { AiSettingsRow } from '../schema';

export interface Settings {
  ssrfMode: 'strict' | 'allow-local';
  activeProvider: string | null;
  modelByProvider: Record<string, string>;
  encryptedKeys: Record<string, string>;
  baseUrlByProvider: Record<string, string>;
}

const DEFAULT: Settings = {
  ssrfMode: 'strict',
  activeProvider: null,
  modelByProvider: {},
  encryptedKeys: {},
  baseUrlByProvider: {},
};

export async function get(): Promise<Settings> {
  const row = dbGet<AiSettingsRow>(`SELECT * FROM ai_settings WHERE id = 'singleton'`);
  if (!row) return DEFAULT;
  return {
    ssrfMode: 'strict',
    activeProvider: row.active_provider,
    modelByProvider: safeParse(row.model_by_provider),
    encryptedKeys: safeParse(row.encrypted_keys),
    baseUrlByProvider: safeParse(row.base_url_by_provider),
  };
}

function safeParse(s: string | null): Record<string, string> {
  if (!s) return {};
  try {
    const obj = JSON.parse(s);
    return typeof obj === 'object' && obj !== null ? (obj as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export interface SaveInput {
  activeProvider: string | null;
  modelByProvider: string;
  encryptedKeys: string;
  baseUrlByProvider: string;
  masterKeyCheck: string;
}

export async function save(input: SaveInput): Promise<void> {
  const existing = dbGet<AiSettingsRow>(`SELECT * FROM ai_settings WHERE id = 'singleton'`);
  if (existing) {
    run(
      `UPDATE ai_settings SET active_provider=?, model_by_provider=?, encrypted_keys=?,
         base_url_by_provider=?, master_key_check=?, updated_at=? WHERE id='singleton'`,
      [
        input.activeProvider,
        input.modelByProvider,
        input.encryptedKeys,
        input.baseUrlByProvider,
        input.masterKeyCheck,
        Date.now(),
      ],
    );
  } else {
    run(
      `INSERT INTO ai_settings (id, active_provider, model_by_provider, encrypted_keys, base_url_by_provider, master_key_check, updated_at)
       VALUES ('singleton', ?, ?, ?, ?, ?, ?)`,
      [
        input.activeProvider,
        input.modelByProvider,
        input.encryptedKeys,
        input.baseUrlByProvider,
        input.masterKeyCheck,
        Date.now(),
      ],
    );
  }
}
