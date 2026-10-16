import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptApiKey, decryptApiKey } from "../lib/api-keys";
import { safeImageUrl, isSafeImageSrc } from "../lib/safe-url";

describe("api-keys", () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    process.env.APP_ENCRYPTION_KEY = "test-encryption-key-32chars-minimum!!";
  });
  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("round-trips a key", () => {
    const secret = "sk-live-abc123";
    const stored = encryptApiKey(secret);
    expect(stored).toMatch(/^v1\./);
    expect(stored).not.toContain(secret);
    expect(decryptApiKey(stored)).toBe(secret);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    expect(encryptApiKey("k")).not.toBe(encryptApiKey("k"));
  });

  it("passes legacy plaintext rows through", () => {
    expect(decryptApiKey("sk-plaintext-legacy")).toBe("sk-plaintext-legacy");
  });

  it("rejects tampered ciphertext", () => {
    const stored = encryptApiKey("sk-secret");
    const parts = stored.split(".");
    parts[3] = parts[3].slice(0, -2) + "AA";
    expect(() => decryptApiKey(parts.join("."))).toThrow();
  });

  it("falls back to JWT_SECRET when APP_ENCRYPTION_KEY is unset", () => {
    delete process.env.APP_ENCRYPTION_KEY;
    process.env.JWT_SECRET = "jwt-secret-for-test";
    const stored = encryptApiKey("sk-fallback");
    expect(decryptApiKey(stored)).toBe("sk-fallback");
  });
});

describe("safe-url", () => {
  it.each([
    "https://cdn.example.com/img.png",
    "http://localhost:3000/x.png",
    "data:image/png;base64,AAAA",
    "data:image/jpeg;base64,BBBB",
  ])("safeImageUrl keeps %s", (url) => {
    expect(safeImageUrl(url)).toBe(url);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "data:image/svg+xml;base64,AAAA",
    "vbscript:x",
    "  javascript:alert(1)",
    "",
  ])("safeImageUrl drops %s", (url) => {
    expect(safeImageUrl(url)).toBeNull();
  });

  it("isSafeImageSrc guards client render", () => {
    expect(isSafeImageSrc("https://x/y.png")).toBe(true);
    expect(isSafeImageSrc("data:image/png;base64,zz")).toBe(true);
    expect(isSafeImageSrc("javascript:alert(1)")).toBe(false);
    expect(isSafeImageSrc(null)).toBe(false);
    expect(isSafeImageSrc(undefined)).toBe(false);
  });
});
