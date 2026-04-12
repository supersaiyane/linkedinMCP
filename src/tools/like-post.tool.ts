import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";

export const likePostSchema = {
  post_urn: z.string().min(1).describe("The URN of the post to like"),
};

export async function likePostHandler(
  args: z.infer<z.ZodObject<typeof likePostSchema>>,
  deps: { apiClient: LinkedInAPIClient; logger: Logger },
) {
  const { apiClient, logger } = deps;

  await apiClient.likePost(args.post_urn);
  logger.info({ postUrn: args.post_urn }, "Post liked");

  return {
    content: [
      {
        type: "text" as const,
        text: `✅ Post liked!\n👍 URN: ${args.post_urn}`,
      },
    ],
  };
}
