import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";

export const getProfileSchema = {};

export async function getProfileHandler(
  _args: z.infer<z.ZodObject<typeof getProfileSchema>>,
  deps: { apiClient: LinkedInAPIClient; logger: Logger },
) {
  const { apiClient, logger } = deps;

  const profile = await apiClient.getUserProfile();

  logger.info({ sub: profile.sub }, "Profile fetched");

  const lines = [
    `Name: ${profile.name}`,
    profile.email ? `Email: ${profile.email}` : null,
    `URN: urn:li:person:${profile.sub}`,
  ].filter(Boolean);

  return {
    content: [
      {
        type: "text" as const,
        text: `LinkedIn Profile\n\n${lines.join("\n")}`,
      },
    ],
  };
}
