import { z } from "zod";
import type { Logger } from "pino";
import type { MediumClient } from "../api/medium-client.js";
import type { TelegramNotifier } from "../services/telegram-notifier.js";

export const mediumPublishSchema = {
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required"),
  content_format: z
    .enum(["markdown", "html"])
    .default("markdown")
    .describe("Content format: markdown or html"),
  tags: z
    .array(z.string())
    .max(5, "Medium allows max 5 tags")
    .optional()
    .describe("Tags for the article (max 5)"),
  publish_status: z
    .enum(["public", "draft", "unlisted"])
    .default("draft")
    .describe("Publish status: public, draft, or unlisted"),
  canonical_url: z
    .string()
    .url()
    .optional()
    .describe("Original article URL if cross-posting"),
};

export async function mediumPublishHandler(
  args: z.infer<z.ZodObject<typeof mediumPublishSchema>>,
  deps: {
    mediumClient: MediumClient;
    notifier: TelegramNotifier | null;
    logger: Logger;
  },
) {
  const { mediumClient, notifier, logger } = deps;

  const result = await mediumClient.createPost({
    title: args.title,
    content: args.content,
    contentFormat: args.content_format,
    tags: args.tags,
    publishStatus: args.publish_status,
    canonicalUrl: args.canonical_url,
  });

  logger.info({ postId: result.id, url: result.url }, "Medium article created");

  await notifier?.notifyMediumPublished(args.title, result.url);

  const statusLabel =
    args.publish_status === "public"
      ? "Published"
      : args.publish_status === "unlisted"
        ? "Published (unlisted)"
        : "Saved as draft";

  return {
    content: [
      {
        type: "text" as const,
        text: `Medium article ${statusLabel.toLowerCase()}!\n\n${args.title}\n${result.url}\nStatus: ${statusLabel}`,
      },
    ],
  };
}
