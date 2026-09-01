import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { encryptKey, ensureMasterKey } from '@/lib/ai/crypto';
import { getSettings, saveSettings } from '@/lib/db/ai-settings';

const Body = z.object({
  activeProvider: z.enum(['openai', 'anthropic', 'google', 'deepseek']).nullable(),
  models: z.record(z.string(), z.string()).default({}),
  apiKeys: z.record(z.string(), z.string()).default({}),
  baseUrls: z.record(z.string(), z.string()).default({}),
});

export async function GET() {
  const s = await getSettings();
  // Never return plaintext keys to the client.
  return NextResponse.json({
    activeProvider: s.activeProvider,
    modelByProvider: s.modelByProvider,
    baseUrlByProvider: s.baseUrlByProvider,
    keySetByProvider: Object.fromEntries(
      Object.keys({ ...s.modelByProvider, ...s.baseUrlByProvider, ...s.encryptedKeys }).map(
        (p) => [p, Boolean(s.encryptedKeys[p])],
      ),
    ),
  });
}

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const master = ensureMasterKey();
  const encrypted: Record<string, string> = {};
  for (const [prov, key] of Object.entries(parsed.data.apiKeys)) {
    // Empty string means "clear this provider's key".
    if (key === '') continue;
    if (key) encrypted[prov] = encryptKey(key, master);
  }
  // If the user passed any empty-string key, start from the existing encrypted
  // map and remove those providers.
  let nextEncrypted: Record<string, string> = encrypted;
  const clearProviders = Object.entries(parsed.data.apiKeys)
    .filter(([, v]) => v === '')
    .map(([k]) => k);
  if (clearProviders.length > 0) {
    const current = await getSettings();
    nextEncrypted = { ...current.encryptedKeys };
    for (const p of clearProviders) delete nextEncrypted[p];
  }
  await saveSettings({
    activeProvider: parsed.data.activeProvider,
    modelByProvider: JSON.stringify(parsed.data.models),
    encryptedKeys: JSON.stringify(nextEncrypted),
    baseUrlByProvider: JSON.stringify(parsed.data.baseUrls),
    masterKeyCheck: 'ok',
  });
  return NextResponse.json({ ok: true });
}
