import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";

export const deletePostSchema = {
  post_urn: z.string().min(1).describe("The URN of the post to delete"),
};

export async function deletePostHandler(
  args: z.infer<z.ZodObject<typeof deletePostSchema>>,
  deps: { apiClient: LinkedInAPIClient; logger: Logger },
) {
  const { apiClient, logger } = deps;

  await apiClient.deletePost(args.post_urn);
  logger.info({ postUrn: args.post_urn }, "Post deleted");

  return {
    content: [
      {
        type: "text" as const,
        text: `✅ Post deleted successfully.\n🗑️ URN: ${args.post_urn}`,
      },
    ],
  };
}
