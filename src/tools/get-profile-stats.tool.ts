import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";

export const getProfileStatsSchema = {};

export async function getProfileStatsHandler(
  _args: z.infer<z.ZodObject<typeof getProfileStatsSchema>>,
  deps: { apiClient: LinkedInAPIClient; logger: Logger },
) {
  const { apiClient, logger } = deps;

  const stats = await apiClient.getProfileStats();
  logger.info("Profile stats fetched");

  const lines = [
    "📊 Profile Stats",
    "",
    `👥 Followers: ${stats.followers}`,
  ];

  if (stats.profileViews !== null) {
    lines.push(`👁️ Profile Views: ${stats.profileViews}`);
  }
  if (stats.searchAppearances !== null) {
    lines.push(`🔍 Search Appearances: ${stats.searchAppearances}`);
  }

  if (stats.profileViews === null && stats.searchAppearances === null) {
    lines.push("");
    lines.push("Note: Profile views and search appearances require additional API permissions that may not be available.");
  }

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
  };
}
