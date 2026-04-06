import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import pino from "pino";
import { FileTokenStore } from "../../src/auth/file-token-store.js";
import type { OAuthToken } from "../../src/models/types.js";

const logger = pino({ level: "silent" });

describe("FileTokenStore", () => {
  let tmpDir: string;
  let filePath: string;
  const key = "test-encryption-key-32-chars-min!!";

  const sampleToken: OAuthToken = {
    accessToken: "access_123",
    refreshToken: "refresh_456",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    refreshExpiresAt: Math.floor(Date.now() / 1000) + 86400 * 365,
    scopes: ["openid", "profile"],
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "token-test-"));
    filePath = path.join(tmpDir, "tokens.enc");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null when no token file exists", async () => {
    const store = new FileTokenStore(filePath, key, logger);
    const result = await store.load();
    expect(result).toBeNull();
  });

  it("saves and loads tokens with encryption roundtrip", async () => {
    const store = new FileTokenStore(filePath, key, logger);
    await store.save(sampleToken);
    const loaded = await store.load();
    expect(loaded).toEqual(sampleToken);
  });

  it("fails to decrypt with wrong key", async () => {
    const store = new FileTokenStore(filePath, key, logger);
    await store.save(sampleToken);
    const wrongStore = new FileTokenStore(filePath, "wrong-key-that-is-32-chars-long!", logger);
    await expect(wrongStore.load()).rejects.toThrow();
  });

  it("deletes token file", async () => {
    const store = new FileTokenStore(filePath, key, logger);
    await store.save(sampleToken);
    expect(fs.existsSync(filePath)).toBe(true);
    await store.delete();
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("sets secure file permissions", async () => {
    const store = new FileTokenStore(filePath, key, logger);
    await store.save(sampleToken);
    const stats = fs.statSync(filePath);
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });
});
