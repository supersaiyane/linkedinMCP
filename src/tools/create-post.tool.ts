import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";
import type { ContentFormatter } from "../services/content-formatter.js";

export const createPostSchema = {
  text: z
    .string()
    .min(1, "Post text cannot be empty")
    .max(3000, "Post text cannot exceed 3000 characters"),
  visibility: z.enum(["PUBLIC", "CONNECTIONS"]).default("PUBLIC"),
  hashtags: z
    .array(
      z
        .string()
        .regex(/^[a-zA-Z0-9]+$/, "Hashtags must be alphanumeric without #"),
    )
    .max(30)
    .optional(),
};

export async function createPostHandler(
  args: z.infer<z.ZodObject<typeof createPostSchema>>,
  deps: {
    apiClient: LinkedInAPIClient;
    contentFormatter: ContentFormatter;
    logger: Logger;
  },
) {
  const { apiClient, contentFormatter, logger } = deps;

  const content = contentFormatter.formatPost(args.text, args.hashtags);

  const validation = contentFormatter.validatePost(content);
  if (!validation.valid) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Validation failed: ${validation.errors.join(", ")}`,
        },
      ],
      isError: true,
    };
  }

  const result = await apiClient.createPost({
    ...content,
    visibility: args.visibility,
    mediaUrns: [],
  });

  logger.info({ postUrn: result.urn }, "Post created successfully");

  return {
    content: [
      {
        type: "text" as const,
        text: `Post published successfully!\n\n${result.url}\nURN: ${result.urn}`,
      },
    ],
  };
}
