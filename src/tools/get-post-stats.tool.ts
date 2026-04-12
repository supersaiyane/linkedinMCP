import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";

export const getPostStatsSchema = {
  post_urn: z.string().min(1).describe("The URN of the post (e.g. urn:li:share:12345)"),
};

export async function getPostStatsHandler(
  args: z.infer<z.ZodObject<typeof getPostStatsSchema>>,
  deps: { apiClient: LinkedInAPIClient; logger: Logger },
) {
  const { apiClient, logger } = deps;

  const stats = await apiClient.getPostStats(args.post_urn);
  logger.info({ postUrn: args.post_urn }, "Post stats fetched");

  return {
    content: [
      {
        type: "text" as const,
        text: [
          `📊 Post Stats for ${args.post_urn}`,
          "",
          `👁️ Impressions: ${stats.impressions}`,
          `👍 Likes: ${stats.likes}`,
          `💬 Comments: ${stats.comments}`,
          `🔄 Shares: ${stats.shares}`,
          `🖱️ Clicks: ${stats.clicks}`,
        ].join("\n"),
      },
    ],
  };
}
