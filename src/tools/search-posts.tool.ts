import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";

export const searchPostsSchema = {
  query: z.string().min(1).describe("Search keyword or hashtag"),
  count: z.number().int().min(1).max(50).default(10).describe("Number of results to return"),
};

export async function searchPostsHandler(
  args: z.infer<z.ZodObject<typeof searchPostsSchema>>,
  deps: { apiClient: LinkedInAPIClient; logger: Logger },
) {
  const { apiClient, logger } = deps;

  const posts = await apiClient.searchPosts(args.query, args.count);
  logger.info({ query: args.query, results: posts.length }, "Posts searched");

  if (posts.length === 0) {
    return {
      content: [{ type: "text" as const, text: `No posts found matching "${args.query}".` }],
    };
  }

  const lines = posts.map((post, i) => {
    const urn = (post.id as string) ?? "unknown";
    const text = ((post.commentary as string) ?? "").slice(0, 100);
    const created = (post.createdAt as number)
      ? new Date(post.createdAt as number).toISOString()
      : "unknown";
    return `${i + 1}. [${created}] ${text}...\n   URN: ${urn}`;
  });

  return {
    content: [
      {
        type: "text" as const,
        text: `🔍 Search results for "${args.query}" (${posts.length})\n\n${lines.join("\n\n")}`,
      },
    ],
  };
}
