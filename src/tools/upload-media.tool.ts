import { z } from "zod";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";
import type { MediaHandler } from "../services/media-handler.js";

export const uploadMediaSchema = {
  file_path: z.string().min(1, "File path is required"),
  alt_text: z.string().optional(),
};

export async function uploadMediaHandler(
  args: z.infer<z.ZodObject<typeof uploadMediaSchema>>,
  deps: {
    apiClient: LinkedInAPIClient;
    mediaHandler: MediaHandler;
    logger: Logger;
  },
) {
  const { apiClient, mediaHandler, logger } = deps;

  const media = mediaHandler.processImage(args.file_path);
  const upload = await apiClient.initializeImageUpload();
  await apiClient.uploadImageBinary(
    upload.uploadUrl,
    media.buffer,
    media.mimeType,
  );

  logger.info({ imageUrn: upload.imageUrn }, "Image uploaded");

  return {
    content: [
      {
        type: "text" as const,
        text: `Image uploaded!\nURN: ${upload.imageUrn}\nUse this URN when creating posts with images.`,
      },
    ],
  };
}
