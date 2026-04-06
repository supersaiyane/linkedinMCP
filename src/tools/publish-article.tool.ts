import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";
import type { ContentFormatter } from "../services/content-formatter.js";
import type { MediaHandler } from "../services/media-handler.js";

export const publishArticleSchema = {
  title: z.string().min(1).max(200),
  body: z.string().min(1, "Article body is required"),
  source_url: z.string().url("A valid source URL is required"),
  cover_image_path: z.string().optional(),
  visibility: z.enum(["PUBLIC", "CONNECTIONS"]).default("PUBLIC"),
};

export async function publishArticleHandler(
  args: z.infer<z.ZodObject<typeof publishArticleSchema>>,
  deps: {
    apiClient: LinkedInAPIClient;
    contentFormatter: ContentFormatter;
    mediaHandler: MediaHandler;
    logger: Logger;
  },
) {
  const { apiClient, contentFormatter, mediaHandler, logger } = deps;

  const validation = contentFormatter.validateArticle({
    title: args.title,
    body: args.body,
  });

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

  let coverImageUrn: string | undefined;
  if (args.cover_image_path) {
    const media = mediaHandler.processImage(args.cover_image_path);
    const upload = await apiClient.initializeImageUpload();
    await apiClient.uploadImageBinary(
      upload.uploadUrl,
      media.buffer,
      media.mimeType,
    );
    coverImageUrn = upload.imageUrn;
  }

  const commentary = contentFormatter.stripMarkdown(args.body);

  const result = await apiClient.createArticlePost({
    commentary:
      commentary.length > 3000 ? commentary.slice(0, 2997) + "..." : commentary,
    sourceUrl: args.source_url,
    title: args.title,
    coverImageUrn,
    visibility: args.visibility,
  });

  logger.info({ postUrn: result.urn }, "Article published");

  return {
    content: [
      {
        type: "text" as const,
        text: `Article published!\n${args.title}\n${result.url}`,
      },
    ],
  };
}
