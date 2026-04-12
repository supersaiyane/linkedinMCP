import { z } from "zod";
import type { Logger } from "pino";
import type { PostScheduler } from "../services/post-scheduler.js";

export const cancelScheduledSchema = {
  id: z.string().describe("The ID of the scheduled post to cancel"),
};

export async function cancelScheduledHandler(
  args: z.infer<z.ZodObject<typeof cancelScheduledSchema>>,
  deps: { scheduler: PostScheduler; logger: Logger },
) {
  const { scheduler, logger } = deps;

  scheduler.cancel(args.id);
  logger.info({ id: args.id }, "Scheduled post cancelled via tool");

  return {
    content: [
      {
        type: "text" as const,
        text: `✅ Scheduled post cancelled.\n🆔 ID: ${args.id}`,
      },
    ],
  };
}
