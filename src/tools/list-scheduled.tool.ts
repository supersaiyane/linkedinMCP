import { z } from "zod";
import type { Logger } from "pino";
import type { PostScheduler } from "../services/post-scheduler.js";

export const listScheduledSchema = {
  status: z
    .enum(["PENDING", "PUBLISHED", "FAILED"])
    .optional()
    .describe("Filter by status"),
};

export async function listScheduledHandler(
  args: z.infer<z.ZodObject<typeof listScheduledSchema>>,
  deps: { scheduler: PostScheduler; logger: Logger },
) {
  const { scheduler } = deps;

  const posts = scheduler.listPosts(args.status);

  if (posts.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "No scheduled posts found.",
        },
      ],
    };
  }

  const lines = posts.map((p) => {
    const preview = JSON.parse(p.contentJson).text?.slice(0, 50) ?? "";
    return `[${p.status}] ${p.scheduledAt} — "${preview}..." (ID: ${p.id})`;
  });

  return {
    content: [
      {
        type: "text" as const,
        text: `Scheduled Posts (${posts.length})\n\n${lines.join("\n")}`,
      },
    ],
  };
}
