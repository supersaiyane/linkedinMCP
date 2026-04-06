import { RateLimitError } from "../models/errors.js";

interface RateLimitBucket {
  maxRequests: number;
  windowMs: number;
  timestamps: number[];
}

export class RateLimiter {
  private buckets: Map<string, RateLimitBucket> = new Map();

  constructor(postsPerDay: number, apiPerMinute: number) {
    this.buckets.set("posts", {
      maxRequests: postsPerDay,
      windowMs: 24 * 60 * 60 * 1000,
      timestamps: [],
    });
    this.buckets.set("api", {
      maxRequests: apiPerMinute,
      windowMs: 60 * 1000,
      timestamps: [],
    });
  }

  checkLimit(operation: string): void {
    const bucket = this.buckets.get(operation);
    if (!bucket) return;

    const now = Date.now();
    bucket.timestamps = bucket.timestamps.filter(
      (t) => now - t < bucket.windowMs,
    );

    if (bucket.timestamps.length >= bucket.maxRequests) {
      const oldest = bucket.timestamps[0]!;
      const retryAfter = Math.ceil(
        (bucket.windowMs - (now - oldest)) / 1000,
      );
      throw new RateLimitError(retryAfter);
    }
  }

  recordRequest(operation: string): void {
    const bucket = this.buckets.get(operation);
    if (!bucket) return;
    bucket.timestamps.push(Date.now());
  }
}
