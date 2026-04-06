import { z } from "zod";
import type { Logger } from "pino";
import type { AuthManager } from "../auth/auth-manager.js";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";
import type { TelegramNotifier } from "../services/telegram-notifier.js";

export const authenticateSchema = {};

export async function authenticateHandler(
  _args: z.infer<z.ZodObject<typeof authenticateSchema>>,
  deps: {
    authManager: AuthManager;
    apiClient: LinkedInAPIClient;
    notifier: TelegramNotifier | null;
    openBrowser: (url: string) => Promise<void>;
    logger: Logger;
  },
) {
  const { authManager, apiClient, notifier, openBrowser, logger } = deps;

  if (await authManager.isAuthenticated()) {
    try {
      const profile = await apiClient.getUserProfile();
      return {
        content: [
          {
            type: "text" as const,
            text: `Already authenticated as ${profile.name} (${profile.sub})`,
          },
        ],
      };
    } catch {
      logger.info("Existing token invalid, re-authenticating...");
    }
  }

  const { url } = authManager.generateAuthUrl();

  await authManager.authenticate(openBrowser);

  const profile = await apiClient.getUserProfile();

  await notifier?.notifyAuthenticated(profile.name);

  return {
    content: [
      {
        type: "text" as const,
        text: `Authenticated as ${profile.name}\n\nOpen this URL if the browser didn't open:\n${url}`,
      },
    ],
  };
}
