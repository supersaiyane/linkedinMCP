import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";

export const replyToCommentSchema = {
  post_urn: z.string().min(1).describe("The URN of the post"),
  comment_urn: z.string().min(1).describe("The URN of the parent comment to reply to"),
  text: z.string().min(1).max(1250).describe("Reply text (max 1250 characters)"),
};

export async function replyToCommentHandler(
  args: z.infer<z.ZodObject<typeof replyToCommentSchema>>,
  deps: { apiClient: LinkedInAPIClient; logger: Logger },
) {
  const { apiClient, logger } = deps;

  const replyUrn = await apiClient.replyToComment(
    args.post_urn,
    args.comment_urn,
    args.text,
  );

  logger.info({ postUrn: args.post_urn, commentUrn: args.comment_urn }, "Reply posted");

  return {
    content: [
      {
        type: "text" as const,
        text: `✅ Reply posted successfully!\n💬 Reply URN: ${replyUrn}`,
      },
    ],
  };
}
