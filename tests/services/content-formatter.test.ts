import { describe, it, expect } from "vitest";
import { ContentFormatter } from "../../src/services/content-formatter.js";

describe("ContentFormatter", () => {
  const formatter = new ContentFormatter();

  describe("formatPost", () => {
    it("trims whitespace", () => {
      const result = formatter.formatPost("  Hello world  ");
      expect(result.text).toBe("Hello world");
    });

    it("appends hashtags", () => {
      const result = formatter.formatPost("Hello", ["tech", "ai"]);
      expect(result.text).toBe("Hello\n\n#tech #ai");
    });

    it("works without hashtags", () => {
      const result = formatter.formatPost("Hello");
      expect(result.text).toBe("Hello");
      expect(result.hashtags).toEqual([]);
    });
  });

  describe("validatePost", () => {
    it("passes valid content", () => {
      const result = formatter.validatePost({ text: "Hello", hashtags: [] });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails on empty text", () => {
      const result = formatter.validatePost({ text: "   ", hashtags: [] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Post text cannot be empty");
    });

    it("fails when text exceeds 3000 chars", () => {
      const text = "x".repeat(3001);
      const result = formatter.validatePost({ text, hashtags: [] });
      expect(result.valid).toBe(false);
    });

    it("fails when too many hashtags", () => {
      const tags = Array.from({ length: 31 }, (_, i) => `tag${i}`);
      const result = formatter.validatePost({ text: "Hello", hashtags: tags });
      expect(result.valid).toBe(false);
    });
  });

  describe("validateArticle", () => {
    it("passes valid article", () => {
      const result = formatter.validateArticle({ title: "Title", body: "Body" });
      expect(result.valid).toBe(true);
    });

    it("fails on empty title", () => {
      const result = formatter.validateArticle({ title: "", body: "Body" });
      expect(result.valid).toBe(false);
    });

    it("fails on title exceeding 200 chars", () => {
      const result = formatter.validateArticle({
        title: "x".repeat(201),
        body: "Body",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("stripMarkdown", () => {
    it("strips bold markers", () => {
      expect(formatter.stripMarkdown("**bold**")).toBe("bold");
    });

    it("converts links", () => {
      expect(formatter.stripMarkdown("[click](https://example.com)")).toBe(
        "click (https://example.com)",
      );
    });

    it("strips headings", () => {
      expect(formatter.stripMarkdown("## Heading")).toBe("Heading");
    });
  });

  describe("extractHashtags", () => {
    it("extracts hashtags from text", () => {
      expect(formatter.extractHashtags("Hello #tech and #ai")).toEqual([
        "tech",
        "ai",
      ]);
    });

    it("returns empty for no hashtags", () => {
      expect(formatter.extractHashtags("No hashtags here")).toEqual([]);
    });
  });
});
