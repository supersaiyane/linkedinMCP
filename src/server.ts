import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Logger } from "pino";
import type { AuthManager } from "./auth/auth-manager.js";
import type { LinkedInAPIClient } from "./api/linkedin-client.js";
import type { ContentFormatter } from "./services/content-formatter.js";
import type { MediaHandler } from "./services/media-handler.js";
import type { PostScheduler } from "./services/post-scheduler.js";
import {
  authenticateSchema,
  authenticateHandler,
  createPostSchema,
  createPostHandler,
  publishArticleSchema,
  publishArticleHandler,
  uploadMediaSchema,
  uploadMediaHandler,
  getProfileSchema,
  getProfileHandler,
  schedulePostSchema,
  schedulePostHandler,
  listScheduledSchema,
  listScheduledHandler,
} from "./tools/index.js";
import { LinkedInMCPError } from "./models/errors.js";

interface ServerDeps {
  authManager: AuthManager;
  apiClient: LinkedInAPIClient;
  contentFormatter: ContentFormatter;
  mediaHandler: MediaHandler;
  scheduler: PostScheduler | null;
  openBrowser: (url: string) => Promise<void>;
  logger: Logger;
}

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function makeErrorResult(err: unknown): ToolResult {
  const message =
    err instanceof LinkedInMCPError
      ? err.message
      : err instanceof Error
        ? err.message
        : String(err);
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

export class LinkedInMCPServer {
  public readonly server: McpServer;

  constructor(private deps: ServerDeps) {
    this.server = new McpServer({
      name: "linkedin-mcp",
      version: "1.0.0",
    });

    this.registerTools();
  }

  private registerTools(): void {
    const { authManager, apiClient, contentFormatter, mediaHandler, scheduler, openBrowser, logger } = this.deps;

    this.server.tool(
      "linkedin_authenticate",
      "Authenticate with LinkedIn OAuth 2.0. Opens browser for authorization.",
      authenticateSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await authenticateHandler(args, { authManager, apiClient, openBrowser, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    this.server.tool(
      "linkedin_create_post",
      "Create a text post on LinkedIn with optional hashtags and visibility control.",
      createPostSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await createPostHandler(args, { apiClient, contentFormatter, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    this.server.tool(
      "linkedin_publish_article",
      "Publish an article on LinkedIn with a source URL, optional cover image.",
      publishArticleSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await publishArticleHandler(args, { apiClient, contentFormatter, mediaHandler, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    this.server.tool(
      "linkedin_upload_media",
      "Upload an image to LinkedIn for use in posts.",
      uploadMediaSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await uploadMediaHandler(args, { apiClient, mediaHandler, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    this.server.tool(
      "linkedin_get_profile",
      "Get the authenticated user's LinkedIn profile information.",
      getProfileSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await getProfileHandler(args, { apiClient, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    if (scheduler) {
      this.server.tool(
        "linkedin_schedule_post",
        "Schedule a LinkedIn post for future publication.",
        schedulePostSchema,
        async (args): Promise<ToolResult> => {
          try {
            return await schedulePostHandler(args, { contentFormatter, scheduler, logger }) as ToolResult;
          } catch (err) {
            return makeErrorResult(err);
          }
        },
      );

      this.server.tool(
        "linkedin_list_scheduled",
        "List scheduled LinkedIn posts with optional status filter.",
        listScheduledSchema,
        async (args): Promise<ToolResult> => {
          try {
            return await listScheduledHandler(args, { scheduler, logger }) as ToolResult;
          } catch (err) {
            return makeErrorResult(err);
          }
        },
      );
    }
  }
}
