import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { LINKEDIN_API } from "../config/linkedin-api.js";
import { InvalidMediaError } from "../models/errors.js";

interface ProcessedMedia {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
}

const EXTENSION_MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
};

function resolvePath(filePath: string): string {
  if (filePath.startsWith("~")) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return path.resolve(filePath);
}

export class MediaHandler {
  processImage(filePath: string): ProcessedMedia {
    const resolved = resolvePath(filePath);

    if (!fs.existsSync(resolved)) {
      throw new InvalidMediaError(`File not found: ${filePath}`);
    }

    const ext = path.extname(resolved).toLowerCase();
    const mimeType = EXTENSION_MIME_MAP[ext];

    if (
      !mimeType ||
      !(LINKEDIN_API.LIMITS.ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)
    ) {
      throw new InvalidMediaError(
        `Unsupported image type: ${ext}. Allowed: jpeg, png, gif`,
      );
    }

    const buffer = fs.readFileSync(resolved);
    const sizeBytes = buffer.length;

    if (sizeBytes > LINKEDIN_API.LIMITS.IMAGE_MAX_SIZE_BYTES) {
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
      throw new InvalidMediaError(
        `Image too large: ${sizeMB}MB. Maximum: 8MB`,
      );
    }

    return { buffer, mimeType, sizeBytes };
  }
}
