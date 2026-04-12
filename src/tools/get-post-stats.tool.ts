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

  const lines = [
    `📊 Post Stats for ${args.post_urn}`,
    "",
    `👍 Likes: ${stats.likes}`,
    `💬 Comments: ${stats.comments}`,
    `🔄 Shares: ${stats.shares}`,
  ];

  if (stats.impressions > 0) {
    lines.push(`👁️ Impressions: ${stats.impressions}`);
  }
  if (stats.clicks > 0) {
    lines.push(`🖱️ Clicks: ${stats.clicks}`);
  }
  if (stats.impressions === 0 && stats.clicks === 0) {
    lines.push("");
    lines.push("Note: Impressions and clicks are only available for Company Page posts (Marketing API).");
  }

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
  };
}
