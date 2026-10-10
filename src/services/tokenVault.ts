// Encrypts social account tokens before they go into user_settings. That table is readable
// with the public anon key, so stored tokens must be useless without a server-only secret.
// Server-only.
import crypto from 'crypto';

// Seal with the first configured secret; open with any of them, so adding TOKEN_VAULT_KEY
// later doesn't strand tokens sealed with an earlier key.
const secrets = () => [
  process.env.TOKEN_VAULT_KEY,
  process.env.TIKTOK_CLIENT_SECRET,
  process.env.LINKEDIN_CLIENT_SECRET,
  process.env.META_APP_SECRET,
  process.env.CLAUDE_API_KEY,
].filter(Boolean) as string[];
const keyFor = (secret: string) => crypto.createHash('sha256').update(`titanleap-vault:${secret}`).digest();

export function seal(value?: string | null): string | null {
  if (!value) return null;
  const secret = secrets()[0];
  if (!secret) throw new Error('No server secret available to encrypt account tokens (set TOKEN_VAULT_KEY)');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFor(secret), iv);
  const ct = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return 'enc:v1:' + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

export function unseal(value?: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('enc:v1:')) return value; // legacy plain-text token
  const raw = Buffer.from(value.slice(7), 'base64');
  for (const secret of secrets()) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyFor(secret), raw.subarray(0, 12));
      decipher.setAuthTag(raw.subarray(12, 28));
      return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
    } catch {}
  }
  return null;
}

const TOKEN_FIELDS = [
  'facebook_token', 'facebook_refresh_token', 'linkedin_token', 'linkedin_refresh_token',
  'twitter_token', 'twitter_refresh_token', 'tiktok_token', 'tiktok_refresh_token',
  'youtube_token', 'youtube_refresh_token',
];

// A user_settings row with its token fields decrypted.
export function openCreds<T extends Record<string, any> | null>(row: T): T {
  if (!row) return row;
  const out: Record<string, any> = { ...row };
  for (const f of TOKEN_FIELDS) if (f in out) out[f] = unseal(out[f]);
  return out as T;
}
