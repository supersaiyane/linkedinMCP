import { describe, it, expect } from "vitest";
import { RateLimiter } from "../../src/api/rate-limiter.js";
import { RateLimitError } from "../../src/models/errors.js";

describe("RateLimiter", () => {
  it("allows requests within limits", () => {
    const limiter = new RateLimiter(100, 10);
    expect(() => limiter.checkLimit("api")).not.toThrow();
    limiter.recordRequest("api");
    expect(() => limiter.checkLimit("api")).not.toThrow();
  });

  it("throws RateLimitError when limit exceeded", () => {
    const limiter = new RateLimiter(100, 2);
    limiter.recordRequest("api");
    limiter.recordRequest("api");
    expect(() => limiter.checkLimit("api")).toThrow(RateLimitError);
  });

  it("provides retryAfterSeconds on error", () => {
    const limiter = new RateLimiter(100, 1);
    limiter.recordRequest("api");
    try {
      limiter.checkLimit("api");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("allows unknown operations without error", () => {
    const limiter = new RateLimiter(100, 10);
    expect(() => limiter.checkLimit("unknown")).not.toThrow();
    limiter.recordRequest("unknown");
  });

  it("enforces posts-per-day limit independently", () => {
    const limiter = new RateLimiter(2, 100);
    limiter.recordRequest("posts");
    limiter.recordRequest("posts");
    expect(() => limiter.checkLimit("posts")).toThrow(RateLimitError);
    expect(() => limiter.checkLimit("api")).not.toThrow();
  });
});
