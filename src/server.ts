import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Logger } from "pino";
import type { AuthManager } from "./auth/auth-manager.js";
import type { LinkedInAPIClient } from "./api/linkedin-client.js";
import type { MediumClient } from "./api/medium-client.js";
import type { ContentFormatter } from "./services/content-formatter.js";
import type { MediaHandler } from "./services/media-handler.js";
import type { PostScheduler } from "./services/post-scheduler.js";
import type { TelegramNotifier } from "./services/telegram-notifier.js";
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
  cancelScheduledSchema,
  cancelScheduledHandler,
  mediumPublishSchema,
  mediumPublishHandler,
  mediumProfileSchema,
  mediumProfileHandler,
  getPostStatsSchema,
  getPostStatsHandler,
  getCommentsSchema,
  getCommentsHandler,
  replyToCommentSchema,
  replyToCommentHandler,
  deletePostSchema,
  deletePostHandler,
  createPostWithImageSchema,
  createPostWithImageHandler,
  getProfileStatsSchema,
  getProfileStatsHandler,
  editPostSchema,
  editPostHandler,
  likePostSchema,
  likePostHandler,
  searchPostsSchema,
  searchPostsHandler,
} from "./tools/index.js";
import { LinkedInMCPError } from "./models/errors.js";

interface ServerDeps {
  authManager: AuthManager;
  apiClient: LinkedInAPIClient;
  mediumClient: MediumClient | null;
  contentFormatter: ContentFormatter;
  mediaHandler: MediaHandler;
  scheduler: PostScheduler | null;
  notifier: TelegramNotifier | null;
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
      name: "amplifyr-mcp",
      version: "1.0.0",
    });

    this.registerTools();
  }

  private registerTools(): void {
    const { authManager, apiClient, mediumClient, contentFormatter, mediaHandler, scheduler, notifier, openBrowser, logger } = this.deps;

    // ═══ Authentication ═══
    this.server.tool(
      "linkedin_authenticate",
      "Authenticate with LinkedIn OAuth 2.0. Opens browser for authorization.",
      authenticateSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await authenticateHandler(args, { authManager, apiClient, notifier, openBrowser, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    // ═══ Post Creation ═══
    this.server.tool(
      "linkedin_create_post",
      "Create a text post on LinkedIn with optional hashtags and visibility control.",
      createPostSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await createPostHandler(args, { apiClient, contentFormatter, notifier, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    this.server.tool(
      "linkedin_create_post_with_image",
      "Create a LinkedIn post with an image. Uploads the image and creates the post in one step.",
      createPostWithImageSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await createPostWithImageHandler(args, { apiClient, contentFormatter, mediaHandler, logger }) as ToolResult;
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
          return await publishArticleHandler(args, { apiClient, contentFormatter, mediaHandler, notifier, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    // ═══ Post Management ═══
    this.server.tool(
      "linkedin_edit_post",
      "Edit/update the text of an existing LinkedIn post.",
      editPostSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await editPostHandler(args, { apiClient, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    this.server.tool(
      "linkedin_delete_post",
      "Permanently delete a LinkedIn post.",
      deletePostSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await deletePostHandler(args, { apiClient, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    // ═══ Media ═══
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

    // ═══ Engagement ═══
    this.server.tool(
      "linkedin_like_post",
      "Like a LinkedIn post.",
      likePostSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await likePostHandler(args, { apiClient, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    this.server.tool(
      "linkedin_get_comments",
      "Get comments on a LinkedIn post.",
      getCommentsSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await getCommentsHandler(args, { apiClient, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    this.server.tool(
      "linkedin_reply_to_comment",
      "Reply to a comment on a LinkedIn post.",
      replyToCommentSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await replyToCommentHandler(args, { apiClient, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    // ═══ Analytics ═══
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

    this.server.tool(
      "linkedin_get_profile_stats",
      "Get profile statistics: followers, profile views, search appearances.",
      getProfileStatsSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await getProfileStatsHandler(args, { apiClient, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    this.server.tool(
      "linkedin_get_post_stats",
      "Get analytics for a LinkedIn post: impressions, likes, comments, shares, clicks.",
      getPostStatsSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await getPostStatsHandler(args, { apiClient, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    this.server.tool(
      "linkedin_search_posts",
      "Search your LinkedIn posts by keyword or hashtag.",
      searchPostsSchema,
      async (args): Promise<ToolResult> => {
        try {
          return await searchPostsHandler(args, { apiClient, logger }) as ToolResult;
        } catch (err) {
          return makeErrorResult(err);
        }
      },
    );

    // ═══ Scheduling ═══
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

      this.server.tool(
        "linkedin_cancel_scheduled",
        "Cancel a pending scheduled post by ID. Use linkedin_list_scheduled to find IDs.",
        cancelScheduledSchema,
        async (args): Promise<ToolResult> => {
          try {
            return await cancelScheduledHandler(args, { scheduler, logger }) as ToolResult;
          } catch (err) {
            return makeErrorResult(err);
          }
        },
      );
    }

    // ═══ Medium ═══
    if (mediumClient) {
      this.server.tool(
        "medium_publish_article",
        "Publish an article on Medium. Supports markdown and HTML content, tags, and draft/public/unlisted status.",
        mediumPublishSchema,
        async (args): Promise<ToolResult> => {
          try {
            return await mediumPublishHandler(args, { mediumClient, notifier, logger }) as ToolResult;
          } catch (err) {
            return makeErrorResult(err);
          }
        },
      );

      this.server.tool(
        "medium_get_profile",
        "Get the authenticated Medium user profile.",
        mediumProfileSchema,
        async (args): Promise<ToolResult> => {
          try {
            return await mediumProfileHandler(args, { mediumClient, logger }) as ToolResult;
          } catch (err) {
            return makeErrorResult(err);
          }
        },
      );
    }
  }
}
