// AES-256-GCM token encryption via Web Crypto. Existing legacy fitness
// connections encrypted with the previous Fernet scheme must be re-authenticated
// after migration because ciphertexts are not cross-compatible.

// Domain-separation label: even when FITNESS_TOKEN_KEY isn't set and callers
// fall back to JWT_SECRET (see fitness-service.ts::tokenSecret), hashing it
// together with a fixed, purpose-specific label keeps the derived AES-GCM key
// distinct from the raw secret used for JWT signing — operators should still
// set a dedicated FITNESS_TOKEN_KEY in production.
const KEY_DERIVATION_LABEL = 'waymark:fitness-token-encryption:v1';

async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${KEY_DERIVATION_LABEL}:${secret}`));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const IV_LENGTH = 12;

export async function encryptToken(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return toBase64Url(combined);
}

export async function decryptToken(token: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const combined = fromBase64Url(token);
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plaintext);
}
