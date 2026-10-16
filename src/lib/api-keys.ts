import crypto from "node:crypto";

/**
 * At-rest encryption for the per-user upstream API key stored in `configs`.
 * AES-256-GCM with a random IV per write; ciphertext is prefixed `v1.` so
 * legacy plaintext rows keep working until the next save (lazy migration —
 * no backfill needed).
 *
 * The data key comes from APP_ENCRYPTION_KEY, falling back to JWT_SECRET.
 * Rotating whichever key is in use makes stored keys unreadable, so treat it
 * like the JWT secret: set a long random value and keep it stable.
 * Node-only — never import from the edge middleware.
 */

const PREFIX = "v1";

function dataKey(): Buffer {
  const explicit = process.env.APP_ENCRYPTION_KEY;
  const material =
    explicit ??
    (process.env.JWT_SECRET
      ? `flux-ai:api-keys:${process.env.JWT_SECRET}`
      : undefined);
  if (!material) {
    throw new Error(
      "Set APP_ENCRYPTION_KEY (or JWT_SECRET) to encrypt stored API keys.",
    );
  }
  return crypto.createHash("sha256").update(material).digest();
}

export function encryptApiKey(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dataKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptApiKey(stored: string): string {
  if (!stored.startsWith(`${PREFIX}.`)) return stored; // legacy plaintext row
  const [, ivB64, tagB64, ctB64] = stored.split(".");
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error("Stored API key is malformed.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    dataKey(),
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
