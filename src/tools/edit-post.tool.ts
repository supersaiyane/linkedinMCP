import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";

export const editPostSchema = {
  post_urn: z.string().min(1).describe("The URN of the post to edit"),
  text: z.string().min(1).max(3000).describe("New post text (max 3000 characters)"),
};

export async function editPostHandler(
  args: z.infer<z.ZodObject<typeof editPostSchema>>,
  deps: { apiClient: LinkedInAPIClient; logger: Logger },
) {
  const { apiClient, logger } = deps;

  await apiClient.editPost(args.post_urn, args.text);
  logger.info({ postUrn: args.post_urn }, "Post edited");

  return {
    content: [
      {
        type: "text" as const,
        text: `✅ Post updated successfully!\n📝 URN: ${args.post_urn}\n🔗 https://www.linkedin.com/feed/update/${args.post_urn}/`,
      },
    ],
  };
}
