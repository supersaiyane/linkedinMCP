import { z } from "zod";
import type { Logger } from "pino";
import type { ContentFormatter } from "../services/content-formatter.js";
import type { PostScheduler } from "../services/post-scheduler.js";

export const schedulePostSchema = {
  text: z
    .string()
    .min(1, "Post text cannot be empty")
    .max(3000, "Post text cannot exceed 3000 characters"),
  scheduled_time: z.string().datetime("Must be a valid ISO 8601 datetime"),
  visibility: z.enum(["PUBLIC", "CONNECTIONS"]).default("PUBLIC"),
  hashtags: z
    .array(z.string().regex(/^[a-zA-Z0-9]+$/, "Hashtags must be alphanumeric"))
    .max(30)
    .optional(),
};

export async function schedulePostHandler(
  args: z.infer<z.ZodObject<typeof schedulePostSchema>>,
  deps: {
    contentFormatter: ContentFormatter;
    scheduler: PostScheduler;
    logger: Logger;
  },
) {
  const { contentFormatter, scheduler, logger } = deps;

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

  const scheduled = scheduler.schedule({
    contentType: "text",
    contentJson: JSON.stringify(content),
    visibility: args.visibility,
    scheduledAt: args.scheduled_time,
  });

  logger.info(
    { id: scheduled.id, scheduledAt: scheduled.scheduledAt },
    "Post scheduled",
  );

  return {
    content: [
      {
        type: "text" as const,
        text: `Post scheduled for ${scheduled.scheduledAt}\nID: ${scheduled.id}`,
      },
    ],
  };
}
