import { z } from "zod";
import type { Logger } from "pino";
import type { AuthManager } from "../auth/auth-manager.js";

export const authenticateCommunitySchema = {};

export async function authenticateCommunityHandler(
  _args: z.infer<z.ZodObject<typeof authenticateCommunitySchema>>,
  deps: {
    communityAuthManager: AuthManager;
    openBrowser: (url: string) => Promise<void>;
    logger: Logger;
  },
) {
  const { communityAuthManager, openBrowser, logger } = deps;

  const isAuth = await communityAuthManager.isAuthenticated();
  if (isAuth) {
    return {
      content: [
        {
          type: "text" as const,
          text: "✅ Community Management API already authenticated.\nEngagement tools (comments, stats, reply) are ready to use.",
        },
      ],
    };
  }

  const { url } = communityAuthManager.generateAuthUrl();
  logger.info("Starting Community Management API OAuth flow");

  try {
    await communityAuthManager.authenticate(openBrowser);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text" as const,
          text: `❌ Community API authentication failed: ${message}\n\n🔗 If the browser didn't open, visit:\n${url}`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: "✅ Community Management API authenticated!\nEngagement tools (comments, stats, reply) are now available.",
      },
    ],
  };
}
