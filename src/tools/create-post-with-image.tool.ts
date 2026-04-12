import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";
import type { ContentFormatter } from "../services/content-formatter.js";
import type { MediaHandler } from "../services/media-handler.js";

export const createPostWithImageSchema = {
  text: z.string().min(1).max(3000).describe("Post content (max 3000 characters)"),
  image_path: z.string().min(1).describe("Local file path to the image (jpg/png/gif, max 8MB)"),
  visibility: z.enum(["PUBLIC", "CONNECTIONS"]).default("PUBLIC").describe("Post visibility"),
  hashtags: z.array(z.string().regex(/^[a-zA-Z0-9]+$/, "Hashtags must be alphanumeric without #"))
    .max(30).optional().describe("Hashtags to append"),
};

export async function createPostWithImageHandler(
  args: z.infer<z.ZodObject<typeof createPostWithImageSchema>>,
  deps: {
    apiClient: LinkedInAPIClient;
    contentFormatter: ContentFormatter;
    mediaHandler: MediaHandler;
    logger: Logger;
  },
) {
  const { apiClient, contentFormatter, mediaHandler, logger } = deps;

  // 1. Process and upload image
  const imageData = mediaHandler.processImage(args.image_path);
  const { uploadUrl, imageUrn } = await apiClient.initializeImageUpload();
  await apiClient.uploadImageBinary(uploadUrl, imageData.buffer, imageData.mimeType);
  logger.info({ imageUrn }, "Image uploaded for post");

  // 2. Format post content
  const content = contentFormatter.formatPost(args.text, args.hashtags);
  const validation = contentFormatter.validatePost(content);
  if (!validation.valid) {
    return {
      content: [{ type: "text" as const, text: `❌ Validation failed: ${validation.errors.join(", ")}` }],
      isError: true,
    };
  }

  // 3. Create post with image
  const result = await apiClient.createPost({
    ...content,
    visibility: args.visibility,
    mediaUrns: [imageUrn],
  });

  logger.info({ postUrn: result.urn, imageUrn }, "Post with image created");

  return {
    content: [
      {
        type: "text" as const,
        text: `✅ Post with image published!\n\n🔗 ${result.url}\n📝 URN: ${result.urn}\n🖼️ Image: ${imageUrn}`,
      },
    ],
  };
}
