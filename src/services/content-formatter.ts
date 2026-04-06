import { LINKEDIN_API } from "../config/linkedin-api.js";
import type { PostContent } from "../models/types.js";

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ContentFormatter {
  formatPost(
    text: string,
    hashtags?: string[],
  ): Pick<PostContent, "text" | "hashtags"> {
    let formatted = text.trim();

    const tags = hashtags ?? [];
    if (tags.length > 0) {
      const hashtagStr = tags.map((h) => `#${h}`).join(" ");
      formatted = `${formatted}\n\n${hashtagStr}`;
    }

    return { text: formatted, hashtags: tags };
  }

  validatePost(content: Pick<PostContent, "text" | "hashtags">): ValidationResult {
    const errors: string[] = [];

    if (content.text.trim().length === 0) {
      errors.push("Post text cannot be empty");
    }
    if (content.text.length > LINKEDIN_API.LIMITS.POST_TEXT_MAX_CHARS) {
      errors.push(
        `Post text exceeds ${LINKEDIN_API.LIMITS.POST_TEXT_MAX_CHARS} characters`,
      );
    }
    if (
      content.hashtags &&
      content.hashtags.length > LINKEDIN_API.LIMITS.HASHTAGS_MAX
    ) {
      errors.push(
        `Too many hashtags (max ${LINKEDIN_API.LIMITS.HASHTAGS_MAX})`,
      );
    }

    return { valid: errors.length === 0, errors };
  }

  validateArticle(article: {
    title: string;
    body: string;
  }): ValidationResult {
    const errors: string[] = [];

    if (article.title.trim().length === 0) {
      errors.push("Article title cannot be empty");
    }
    if (
      article.title.length > LINKEDIN_API.LIMITS.ARTICLE_TITLE_MAX_CHARS
    ) {
      errors.push(
        `Article title exceeds ${LINKEDIN_API.LIMITS.ARTICLE_TITLE_MAX_CHARS} characters`,
      );
    }
    if (article.body.trim().length === 0) {
      errors.push("Article body cannot be empty");
    }

    return { valid: errors.length === 0, errors };
  }

  stripMarkdown(markdown: string): string {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s+(.*)/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/>\s+(.*)/g, "$1")
      .replace(/[-*+]\s+/g, "- ")
      .trim();
  }

  extractHashtags(text: string): string[] {
    const matches = text.match(/#([a-zA-Z0-9_]+)/g);
    if (!matches) return [];
    return matches.map((m) => m.slice(1));
  }
}
