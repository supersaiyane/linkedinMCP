import { z } from "zod";
import type { Logger } from "pino";
import type { MediumClient } from "../api/medium-client.js";

export const mediumProfileSchema = {};

export async function mediumProfileHandler(
  _args: z.infer<z.ZodObject<typeof mediumProfileSchema>>,
  deps: {
    mediumClient: MediumClient;
    logger: Logger;
  },
) {
  const { mediumClient, logger } = deps;

  const user = await mediumClient.getUser();

  logger.info({ username: user.username }, "Medium profile fetched");

  return {
    content: [
      {
        type: "text" as const,
        text: `Medium Profile\n\nName: ${user.name}\nUsername: @${user.username}\nProfile: ${user.url}`,
      },
    ],
  };
}
