import fs from "node:fs";
import path from "node:path";
import type { Logger } from "pino";
import { OAuthTokenSchema } from "../models/schemas.js";
import type { OAuthToken } from "../models/types.js";
import { TokenStoreError } from "../models/errors.js";
import { encrypt, decrypt, type EncryptedData } from "../utils/crypto.js";
import type { TokenStore } from "./token-store.js";

export class FileTokenStore implements TokenStore {
  constructor(
    private filePath: string,
    private encryptionKey: string,
    private logger: Logger,
  ) {}

  async load(): Promise<OAuthToken | null> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return null;
      }
      const raw = fs.readFileSync(this.filePath, "utf8");
      const encrypted: EncryptedData = JSON.parse(raw);
      const decrypted = decrypt(encrypted, this.encryptionKey);
      const parsed = JSON.parse(decrypted);
      const result = OAuthTokenSchema.safeParse(parsed);
      if (!result.success) {
        this.logger.warn("Token file has invalid schema, deleting");
        await this.delete();
        return null;
      }
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new TokenStoreError(`Failed to load tokens: ${message}`);
    }
  }

  async save(token: OAuthToken): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      const plaintext = JSON.stringify(token);
      const encrypted = encrypt(plaintext, this.encryptionKey);
      fs.writeFileSync(this.filePath, JSON.stringify(encrypted), "utf8");
      fs.chmodSync(this.filePath, 0o600);
      this.logger.info("Tokens saved successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new TokenStoreError(`Failed to save tokens: ${message}`);
    }
  }

  async delete(): Promise<void> {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
        this.logger.info("Token file deleted");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new TokenStoreError(`Failed to delete tokens: ${message}`);
    }
  }
}
