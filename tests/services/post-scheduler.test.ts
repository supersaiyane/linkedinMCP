import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import pino from "pino";
import { PostScheduler } from "../../src/services/post-scheduler.js";
import { PastDateError, SchedulerError } from "../../src/models/errors.js";

const logger = pino({ level: "silent" });

// Minimal mock API client
const mockApiClient = {
  createPost: async () => ({
    urn: "urn:li:share:123",
    url: "https://www.linkedin.com/feed/update/urn:li:share:123/",
  }),
} as never;

describe("PostScheduler", () => {
  let tmpDir: string;
  let dbPath: string;
  let scheduler: PostScheduler;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scheduler-test-"));
    dbPath = path.join(tmpDir, "test.db");
    scheduler = new PostScheduler(dbPath, mockApiClient, logger);
  });

  afterEach(() => {
    scheduler.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("schedules a post in the future", () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const result = scheduler.schedule({
      contentType: "text",
      contentJson: JSON.stringify({ text: "Hello" }),
      visibility: "PUBLIC",
      scheduledAt: futureDate,
    });
    expect(result.id).toBeDefined();
    expect(result.status).toBe("PENDING");
  });

  it("rejects past dates", () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString();
    expect(() =>
      scheduler.schedule({
        contentType: "text",
        contentJson: JSON.stringify({ text: "Hello" }),
        visibility: "PUBLIC",
        scheduledAt: pastDate,
      }),
    ).toThrow(PastDateError);
  });

  it("lists scheduled posts", () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    scheduler.schedule({
      contentType: "text",
      contentJson: JSON.stringify({ text: "Post 1" }),
      visibility: "PUBLIC",
      scheduledAt: futureDate,
    });
    scheduler.schedule({
      contentType: "text",
      contentJson: JSON.stringify({ text: "Post 2" }),
      visibility: "PUBLIC",
      scheduledAt: futureDate,
    });

    const posts = scheduler.listPosts();
    expect(posts).toHaveLength(2);
  });

  it("filters by status", () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    scheduler.schedule({
      contentType: "text",
      contentJson: JSON.stringify({ text: "Pending" }),
      visibility: "PUBLIC",
      scheduledAt: futureDate,
    });

    expect(scheduler.listPosts("PENDING")).toHaveLength(1);
    expect(scheduler.listPosts("PUBLISHED")).toHaveLength(0);
  });

  it("cancels a pending post", () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const post = scheduler.schedule({
      contentType: "text",
      contentJson: JSON.stringify({ text: "Cancel me" }),
      visibility: "PUBLIC",
      scheduledAt: futureDate,
    });

    scheduler.cancel(post.id);
    expect(scheduler.listPosts("PENDING")).toHaveLength(0);
  });

  it("throws on cancelling non-existent post", () => {
    expect(() => scheduler.cancel("non-existent-id")).toThrow(SchedulerError);
  });
});
