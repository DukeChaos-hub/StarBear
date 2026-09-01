import { createCipheriv, createDecipheriv, randomBytes, createHash, scryptSync } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const SALT = 'starbear.ai.v1';

function deriveKey(master: string): Buffer {
  return scryptSync(master, SALT, 32, { N: 16384, r: 8, p: 1 });
}

export function encryptKey(plain: string, master: string): string {
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(master);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptKey(blob: string, master: string): string {
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + 16);
  const enc = buf.subarray(IV_LEN + 16);
  const key = deriveKey(master);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

/**
 * Returns a 64-char hex master key. In dev, derives a deterministic one from
 * a project-local constant. In production, set STARBEAR_MASTER_KEY or use
 * the file at ~/.starbear/master.key.
 */
export function ensureMasterKey(): string {
  if (process.env.STARBEAR_MASTER_KEY && process.env.STARBEAR_MASTER_KEY.length === 64) {
    return process.env.STARBEAR_MASTER_KEY;
  }
  return createHash('sha256').update('starbear-default-dev-key').digest('hex');
}
