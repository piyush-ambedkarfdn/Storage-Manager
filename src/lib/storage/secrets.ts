import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { requireEnv } from "@/lib/env";

/**
 * Server-side secrets helpers, all derived from SECRETS_ENCRYPTION_KEY (32 bytes, base64):
 * - encryptSecret/decryptSecret: AES-256-GCM, for the Google refresh token stored in the database.
 * - sign/verify: HMAC-SHA256, for upload receipts and the OAuth "state".
 */

function masterKey(): Buffer {
  const key = Buffer.from(requireEnv("SECRETS_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) {
    throw new Error("SECRETS_ENCRYPTION_KEY must be 32 bytes in base64. Make one with: openssl rand -base64 32");
  }
  return key;
}

/** Separate keys for separate jobs, so a signature can never be used as a ciphertext key. */
function subKey(purpose: "encrypt" | "sign"): Buffer {
  return createHash("sha256").update(masterKey()).update(`storage-org:${purpose}`).digest();
}

const b64 = (b: Buffer) => b.toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url");

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", subKey("encrypt"), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", b64(iv), b64(cipher.getAuthTag()), b64(data)].join(".");
}

export function decryptSecret(token: string): string {
  const [v, iv, tag, data] = token.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Unknown secret format.");
  const decipher = createDecipheriv("aes-256-gcm", subKey("encrypt"), unb64(iv));
  decipher.setAuthTag(unb64(tag));
  return Buffer.concat([decipher.update(unb64(data)), decipher.final()]).toString("utf8");
}

export function sign(payload: string): string {
  return b64(createHmac("sha256", subKey("sign")).update(payload).digest());
}

export function verify(payload: string, signature: string): boolean {
  const expected = unb64(sign(payload));
  const given = unb64(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** A short signed token carrying JSON, with an expiry (used for the OAuth state). */
export function signToken(data: Record<string, unknown>, ttlSeconds: number): string {
  const body = b64(Buffer.from(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds })));
  return `${body}.${sign(body)}`;
}

export function verifyToken<T extends Record<string, unknown>>(token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !verify(body, sig)) return null;
  try {
    const data = JSON.parse(unb64(body).toString("utf8")) as T & { exp: number };
    return data.exp > Date.now() / 1000 ? data : null;
  } catch {
    return null;
  }
}

/** Proves that the server issued these storage keys to this user (checked by POST /api/photos). */
export function uploadReceipt(userId: string, provider: string, originalKey: string, thumbKey: string): string {
  return sign(`upload:${userId}:${provider}:${originalKey}:${thumbKey}`);
}
