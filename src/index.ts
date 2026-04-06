import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import open from "open";
import { loadConfig } from "./config/env.js";
import { createLogger } from "./utils/logger.js";
import { FileTokenStore } from "./auth/file-token-store.js";
import { EnvTokenStore } from "./auth/env-token-store.js";
import { AuthManager } from "./auth/auth-manager.js";
import { RateLimiter } from "./api/rate-limiter.js";
import { LinkedInAPIClient } from "./api/linkedin-client.js";
import { ContentFormatter } from "./services/content-formatter.js";
import { MediaHandler } from "./services/media-handler.js";
import { PostScheduler } from "./services/post-scheduler.js";
import { TelegramNotifier } from "./services/telegram-notifier.js";
import { MediumClient } from "./api/medium-client.js";
import { LinkedInMCPServer } from "./server.js";
import type { TokenStore } from "./auth/token-store.js";

// Project root: one level up from dist/ (where compiled JS lives)
const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(__filename), "..");

function resolveProjectPath(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(PROJECT_ROOT, p);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.LOG_LEVEL, config.MCP_TRANSPORT);

  // Token store
  const tokenStore: TokenStore =
    config.TOKEN_STORE_TYPE === "env"
      ? new EnvTokenStore(config.LINKEDIN_ACCESS_TOKEN, config.LINKEDIN_REFRESH_TOKEN)
      : new FileTokenStore(resolveProjectPath(config.TOKEN_STORE_PATH), config.TOKEN_ENCRYPTION_KEY, logger);

  // Auth
  const authManager = new AuthManager(
    config.LINKEDIN_CLIENT_ID,
    config.LINKEDIN_CLIENT_SECRET,
    config.LINKEDIN_REDIRECT_URI,
    tokenStore,
    logger,
  );

  // API
  const rateLimiter = new RateLimiter(
    config.RATE_LIMIT_POSTS_PER_DAY,
    config.RATE_LIMIT_API_PER_MINUTE,
  );
  const apiClient = new LinkedInAPIClient(authManager, rateLimiter, logger);

  // Services
  const contentFormatter = new ContentFormatter();
  const mediaHandler = new MediaHandler();

  let scheduler: PostScheduler | null = null;
  if (config.SCHEDULER_ENABLED) {
    scheduler = new PostScheduler(resolveProjectPath(config.SCHEDULER_DB_PATH), apiClient, logger);
    scheduler.start();
  }

  // Telegram notifications (optional)
  let notifier: TelegramNotifier | null = null;
  if (config.TELEGRAM_BOT_TOKEN && config.TELEGRAM_CHAT_ID) {
    notifier = new TelegramNotifier(config.TELEGRAM_BOT_TOKEN, config.TELEGRAM_CHAT_ID, logger);
    logger.info("Telegram notifications enabled");
    if (scheduler) {
      scheduler.setNotifier(notifier);
    }
  }

  // Medium client (optional)
  let mediumClient: MediumClient | null = null;
  if (config.MEDIUM_INTEGRATION_TOKEN) {
    mediumClient = new MediumClient(config.MEDIUM_INTEGRATION_TOKEN, logger);
    logger.info("Medium integration enabled");
  }

  // Server
  const mcpServer = new LinkedInMCPServer({
    authManager,
    apiClient,
    mediumClient,
    contentFormatter,
    mediaHandler,
    scheduler,
    notifier,
    openBrowser: async (url: string) => {
      await open(url);
    },
    logger,
  });

  // Graceful shutdown
  const shutdown = (): void => {
    logger.info("Shutting down...");
    scheduler?.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Transport
  if (config.MCP_TRANSPORT === "sse") {
    let sseTransport: SSEServerTransport | null = null;

    const httpServer = http.createServer(async (req, res) => {
      if (req.method === "GET" && req.url === "/sse") {
        sseTransport = new SSEServerTransport("/messages", res);
        await mcpServer.server.connect(sseTransport);
        logger.info("SSE client connected");
      } else if (req.method === "POST" && req.url === "/messages") {
        if (sseTransport) {
          await sseTransport.handlePostMessage(req, res);
        } else {
          res.writeHead(400);
          res.end("No SSE connection established");
        }
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    httpServer.listen(config.SSE_PORT, () => {
      logger.info({ port: config.SSE_PORT }, "SSE server listening");
    });
  } else {
    const transport = new StdioServerTransport();
    await mcpServer.server.connect(transport);
    logger.info("Connected via stdio transport");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
