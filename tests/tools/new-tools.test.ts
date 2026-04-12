import { describe, it, expect, beforeEach } from "vitest";
import "../setup.js";
import { LinkedInAPIClient } from "../../src/api/linkedin-client.js";
import { RateLimiter } from "../../src/api/rate-limiter.js";
import { ContentFormatter } from "../../src/services/content-formatter.js";
import { MediaHandler } from "../../src/services/media-handler.js";
import { AuthManager } from "../../src/auth/auth-manager.js";
import type { TokenStore } from "../../src/auth/token-store.js";
import type { Logger } from "pino";
import { getPostStatsHandler } from "../../src/tools/get-post-stats.tool.js";
import { getCommentsHandler } from "../../src/tools/get-comments.tool.js";
import { replyToCommentHandler } from "../../src/tools/reply-to-comment.tool.js";
import { deletePostHandler } from "../../src/tools/delete-post.tool.js";
import { editPostHandler } from "../../src/tools/edit-post.tool.js";
import { likePostHandler } from "../../src/tools/like-post.tool.js";
import { getProfileStatsHandler } from "../../src/tools/get-profile-stats.tool.js";
import { searchPostsHandler } from "../../src/tools/search-posts.tool.js";
import { createPostWithImageHandler } from "../../src/tools/create-post-with-image.tool.js";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Shared test fixtures
const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
} as unknown as Logger;

const mockTokenStore: TokenStore = {
  load: async () => ({
    accessToken: "test_token",
    refreshToken: "test_refresh",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    refreshExpiresAt: Math.floor(Date.now() / 1000) + 86400,
    scopes: ["openid", "profile", "w_member_social"],
  }),
  save: async () => {},
  delete: async () => {},
};

let apiClient: LinkedInAPIClient;

beforeEach(() => {
  const authManager = new AuthManager(
    "test_client_id",
    "test_client_secret",
    "http://localhost:3456/callback",
    mockTokenStore,
    mockLogger,
  );
  const rateLimiter = new RateLimiter(100, 150);
  apiClient = new LinkedInAPIClient(authManager, rateLimiter, mockLogger);
});

describe("linkedin_get_post_stats", () => {
  it("returns post statistics", async () => {
    const result = await getPostStatsHandler(
      { post_urn: "urn:li:share:123" },
      { apiClient, logger: mockLogger },
    );

    expect(result.content[0].text).toContain("Impressions: 1250");
    expect(result.content[0].text).toContain("Likes: 42");
    expect(result.content[0].text).toContain("Comments: 8");
    expect(result.content[0].text).toContain("Shares: 5");
    expect(result.content[0].text).toContain("Clicks: 73");
  });
});

describe("linkedin_get_comments", () => {
  it("returns comments on a post", async () => {
    const result = await getCommentsHandler(
      { post_urn: "urn:li:share:123", count: 20 },
      { apiClient, logger: mockLogger },
    );

    expect(result.content[0].text).toContain("Comments on urn:li:share:123 (2)");
    expect(result.content[0].text).toContain("Great post!");
    expect(result.content[0].text).toContain("Thanks for sharing.");
  });
});

describe("linkedin_reply_to_comment", () => {
  it("replies to a comment", async () => {
    const result = await replyToCommentHandler(
      {
        post_urn: "urn:li:share:123",
        comment_urn: "urn:li:comment:(urn:li:share:123,456)",
        text: "Thank you!",
      },
      { apiClient, logger: mockLogger },
    );

    expect(result.content[0].text).toContain("Reply posted successfully");
  });
});

describe("linkedin_delete_post", () => {
  it("deletes a post", async () => {
    const result = await deletePostHandler(
      { post_urn: "urn:li:share:123" },
      { apiClient, logger: mockLogger },
    );

    expect(result.content[0].text).toContain("Post deleted successfully");
    expect(result.content[0].text).toContain("urn:li:share:123");
  });
});

describe("linkedin_edit_post", () => {
  it("edits a post", async () => {
    const result = await editPostHandler(
      { post_urn: "urn:li:share:123", text: "Updated post text" },
      { apiClient, logger: mockLogger },
    );

    expect(result.content[0].text).toContain("Post updated successfully");
    expect(result.content[0].text).toContain("urn:li:share:123");
  });
});

describe("linkedin_like_post", () => {
  it("likes a post", async () => {
    const result = await likePostHandler(
      { post_urn: "urn:li:share:123" },
      { apiClient, logger: mockLogger },
    );

    expect(result.content[0].text).toContain("Post liked");
  });
});

describe("linkedin_get_profile_stats", () => {
  it("returns profile statistics", async () => {
    const result = await getProfileStatsHandler(
      {},
      { apiClient, logger: mockLogger },
    );

    expect(result.content[0].text).toContain("Followers: 4832");
  });
});

describe("linkedin_search_posts", () => {
  it("returns matching posts", async () => {
    const result = await searchPostsHandler(
      { query: "AI", count: 10 },
      { apiClient, logger: mockLogger },
    );

    expect(result.content[0].text).toContain("Search results");
    expect(result.content[0].text).toContain("AI");
  });

  it("returns empty when no matches", async () => {
    const result = await searchPostsHandler(
      { query: "xyznonexistent", count: 10 },
      { apiClient, logger: mockLogger },
    );

    expect(result.content[0].text).toContain("No posts found");
  });
});

describe("linkedin_create_post_with_image", () => {
  it("uploads image and creates post in one step", async () => {
    // Create a temporary test image file
    const testDir = join(tmpdir(), "amplifyr-test");
    mkdirSync(testDir, { recursive: true });
    const testImagePath = join(testDir, "test.png");
    // Minimal valid PNG: 1x1 pixel
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8bit RGB
      0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT
      0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
      0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
      0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND
      0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    writeFileSync(testImagePath, pngHeader);

    try {
      const contentFormatter = new ContentFormatter();
      const mediaHandler = new MediaHandler(mockLogger);

      const result = await createPostWithImageHandler(
        {
          text: "Test post with image",
          image_path: testImagePath,
          visibility: "PUBLIC",
        },
        { apiClient, contentFormatter, mediaHandler, logger: mockLogger },
      );

      expect(result.content[0].text).toContain("Post with image published");
      expect(result.content[0].text).toContain("urn:li:image:");
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});
