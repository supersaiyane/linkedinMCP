import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";

export const getCommentsSchema = {
  post_urn: z.string().min(1).describe("The URN of the post"),
  count: z.number().int().min(1).max(100).default(20).describe("Number of comments to fetch"),
};

export async function getCommentsHandler(
  args: z.infer<z.ZodObject<typeof getCommentsSchema>>,
  deps: { apiClient: LinkedInAPIClient; logger: Logger },
) {
  const { apiClient, logger } = deps;

  const comments = await apiClient.getComments(args.post_urn, args.count);
  logger.info({ postUrn: args.post_urn, count: comments.length }, "Comments fetched");

  if (comments.length === 0) {
    return {
      content: [{ type: "text" as const, text: "No comments found on this post." }],
    };
  }

  const lines = comments.map((c, i) => {
    const date = c.timestamp ? new Date(c.timestamp).toISOString() : "unknown";
    return `${i + 1}. [${date}] ${c.author}\n   "${c.text}"\n   URN: ${c.commentUrn}`;
  });

  return {
    content: [
      {
        type: "text" as const,
        text: `💬 Comments on ${args.post_urn} (${comments.length})\n\n${lines.join("\n\n")}`,
      },
    ],
  };
}
