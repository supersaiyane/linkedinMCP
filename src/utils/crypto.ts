import crypto from "node:crypto";

export interface EncryptedData {
  iv: string;
  tag: string;
  data: string;
}

function deriveKey(key: string): Buffer {
  return crypto.createHash("sha256").update(key).digest();
}

export function encrypt(plaintext: string, key: string): EncryptedData {
  const derivedKey = deriveKey(key);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, iv);
  const encrypted = cipher.update(plaintext, "utf8", "hex") + cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return {
    iv: iv.toString("hex"),
    tag,
    data: encrypted,
  };
}

export function decrypt(encrypted: EncryptedData, key: string): string {
  const derivedKey = deriveKey(key);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    derivedKey,
    Buffer.from(encrypted.iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "hex"));
  return decipher.update(encrypted.data, "hex", "utf8") + decipher.final("utf8");
}
