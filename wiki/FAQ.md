---
title: Frequently Asked Questions
sidebar_label: FAQ
sidebar_position: 16
audience: L1-L5
---

# Frequently Asked Questions

**TL;DR** -- Answers to the most common questions about the AmplifyrMCP, organized by audience level. For step-by-step fixes to specific errors, see the [Troubleshooting](Troubleshooting) page instead.

---

## General (Everyone)

### What does this server do?

It connects Claude Desktop (or any MCP client) to LinkedIn, Medium, and Telegram. You describe what you want in natural language -- "post this to LinkedIn", "publish an article on Medium", "schedule a post for tomorrow" -- and Claude calls the appropriate tool behind the scenes. The server handles OAuth authentication, API requests, content formatting, rate limiting, and post scheduling.

### Is this free to use?

Yes. The LinkedIn API is free for posting to your own profile. Medium's API is free for publishing. The Telegram Bot API is free. The server itself is open source. The only cost is your Claude Desktop subscription, which you already have if you are reading this.

### Does this post to my personal profile or company page?

Personal profile only. All posts go to your LinkedIn feed under your name. Company page posting requires a different API scope (`w_organization_social`) and is not supported in this version.

### Does Claude read my LinkedIn feed or messages?

No. The server only has posting and profile-reading capabilities. It cannot access your feed, messages, connections, or other people's profiles. The OAuth scopes used (`w_member_social`, `openid`, `profile`) restrict access to posting and reading your own basic profile information.

### Can other people use my server to post as me?

No. OAuth tokens are encrypted with AES-256-GCM on your local machine. Someone would need both physical access to your computer and your encryption key to use them. See [Configuration](Configuration) for token storage details.

---

## Getting Started (Novice / Practitioner)

### Do I need to authenticate every time?

No. You authenticate once by approving access in your browser. Tokens are encrypted and stored on disk. Access tokens refresh automatically using the refresh token. You only need to re-authenticate if the refresh token expires (roughly one year) or is manually revoked. See the `linkedin_authenticate` tool in [Tools-Reference](Tools-Reference) for the full flow.

### Do I need a LinkedIn Page to create the developer app?

Technically yes -- LinkedIn requires a Page association during app creation. However, the Page has zero impact on where posts go. Posts always go to your personal profile. If you do not have a Page, create a placeholder. The [LinkedIn-App-Setup](LinkedIn-App-Setup) guide covers this step.

### What is the minimum config needed?

Two environment variables: `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`. Everything else has sensible defaults. Set these in either a `.env` file or the Claude Desktop config `env` block. See [Configuration](Configuration) for the full variable reference and [Getting-Started](Getting-Started) for the walkthrough.

### Can I use this with Claude Code CLI instead of Claude Desktop?

Yes. The server uses stdio transport by default, which works with any MCP client that supports the protocol. The configuration is identical. Pass the same `command`, `args`, and `env` block you would use for Claude Desktop.

---

## Integrations (Practitioner)

### Are Telegram notifications required?

No. Telegram is entirely optional. If `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are not set, the server operates identically -- just without notifications. See [Telegram-Setup](Telegram-Setup) for how to enable them.

### Can notifications fail silently?

Yes, by design. Notifications are best-effort. If the Telegram API is unreachable or the bot token is invalid, the primary operation (posting, scheduling) still succeeds. A warning is logged to stderr but nothing breaks.

### Can I send Telegram notifications to a group?

Yes. Add the bot to a group, send any message in the group, then retrieve the group chat ID (it will be a negative number, such as `-987654321`). Set that as `TELEGRAM_CHAT_ID`. The [Telegram-Setup](Telegram-Setup) page explains how to find the chat ID.

### Do I need a Medium account to use LinkedIn features?

No. Medium integration is completely independent. If `MEDIUM_INTEGRATION_TOKEN` is not set, the Medium tools do not appear in Claude's tool list. All LinkedIn features work on their own. See [Medium-Setup](Medium-Setup) for setup instructions.

### Can I cross-post from my blog to Medium?

Yes. Use the `canonical_url` parameter when publishing to Medium. This tells search engines which version is the original, preventing SEO penalties for duplicate content. The `medium_publish_article` tool in [Tools-Reference](Tools-Reference) documents this parameter.

### Why is the default Medium publish status "draft"?

Safety. A draft lets you review formatting, add cover images, and preview on Medium before it goes live. You can override this by setting `publish_status` to `public` for instant publishing if you prefer.

### Can I edit a Medium article after publishing?

Not through this server. Medium's API does not support editing published posts. You would need to edit directly on medium.com.

---

## Architecture (Integrator / Architect)

### Why axios over fetch?

Axios provides an interceptor pipeline for injecting auth headers, handling retries on transient failures, and managing rate limit responses -- all without wrapping every individual call. The retry interceptor in `src/api/retry.ts` handles 429, 5xx, and network errors with exponential backoff and jitter. See [Architecture](Architecture) for the full component breakdown.

### Why SQLite for the scheduler?

Zero external dependencies. The scheduler needs durable persistence for scheduled posts, but a full database server would be overkill for a single-user local tool. `better-sqlite3` provides synchronous reads and writes, requires no configuration, and the database file lives in the `data/` directory alongside the encrypted token file.

### Why pino for logging?

Speed and structure. Pino outputs structured JSON logs with minimal overhead. The critical requirement is that in stdio mode, all logs go to stderr (file descriptor 2) because stdout is reserved for MCP JSON-RPC messages. Writing anything else to stdout would corrupt the protocol stream. The logger factory in `src/utils/logger.ts` enforces this.

### Why Zod for validation?

Zod validates both tool inputs and LinkedIn API responses at runtime. The MCP SDK's `server.tool()` method accepts raw Zod schemas directly -- no conversion to JSON Schema needed. This gives type-safe validation at the boundary where data enters the system (user input) and where it returns (API responses). Schemas are defined once in `src/models/schemas.ts` and the TypeScript types are inferred from them.

### Can I run this on a server or VPS?

Yes. Set `MCP_TRANSPORT=sse` and `SSE_PORT=3001` to expose the server over HTTP with Server-Sent Events. For initial OAuth authentication, you need browser access once. After that, switch to `TOKEN_STORE_TYPE=env` with pre-obtained tokens for fully headless operation. See [Configuration](Configuration) for the relevant variables.

### Can I use Docker?

Yes. The project includes a multi-stage Dockerfile. Docker defaults to SSE transport.

```bash
docker build -t amplifyr-mcp .
docker run --env-file .env -p 3001:3001 amplifyr-mcp
```

See [Getting-Started](Getting-Started) for Docker setup details.

### What happens if Claude Desktop is closed when a scheduled post is due?

The post does not publish. The scheduler runs as part of the MCP server process, which is only alive while Claude Desktop is running. When you reopen Claude Desktop, the scheduler picks up overdue posts and publishes them immediately. If a post has been pending for an extended period, it still attempts delivery on the next startup.

---

## Security (Operator / Architect)

### Where are my tokens stored?

In `data/tokens.enc`, encrypted with AES-256-GCM. The encryption key is derived from your `TOKEN_ENCRYPTION_KEY` environment variable via SHA-256. The file has restrictive permissions (0600 -- owner read/write only). The `data/` directory itself is set to 0700. See [Architecture](Architecture) for the encryption flow and [Configuration](Configuration) for storage options.

### Is my Client Secret safe?

As long as you do not commit your `.env` file (it is gitignored by default) or paste your secret into source code. The recommended approach is to set secrets in the Claude Desktop config `env` block, which keeps them entirely outside the project directory. Never log tokens, even at debug level -- the server enforces this.

### Can I rotate my encryption key?

Yes, but you must re-authenticate afterward. Changing `TOKEN_ENCRYPTION_KEY` makes the existing `data/tokens.enc` file undecryptable. Delete the old token file and run `linkedin_authenticate` again to obtain fresh tokens encrypted with the new key.

### What data does this server send to LinkedIn?

Only what you explicitly ask it to send: post text, images, article metadata, and hashtags. The server also reads your basic profile info (name, member URN) to construct API requests. It does not send telemetry, analytics, or any data beyond what is required for the requested operation.

### How secure are Telegram notifications?

Notifications are sent over HTTPS to the Telegram Bot API. The message content includes post text and status. If your notification content is sensitive, consider using a private chat with the bot rather than a group. The bot token should be treated as a secret -- store it the same way you store your LinkedIn credentials.

---

## Operations (Operator / SRE)

### What are the rate limits?

Two layers. The server enforces local sliding-window limits: 100 posts per day and 150 API calls per minute (both configurable via `RATE_LIMIT_POSTS_PER_DAY` and `RATE_LIMIT_API_PER_MINUTE`). LinkedIn also enforces its own server-side limits, returning HTTP 429 when exceeded. The retry interceptor handles 429 responses with exponential backoff. See [Configuration](Configuration) for rate limit settings and [Architecture](Architecture) for the rate limiter design.

### Maximum post length?

3000 characters for LinkedIn text posts, including any appended hashtags. Article titles are capped at 200 characters. These are LinkedIn API constraints. The content formatter validates lengths before sending. See [Tools-Reference](Tools-Reference) for per-tool input limits.

### Can I post images? Videos?

Images: yes. Upload with `linkedin_upload_media`, then reference the returned URN when creating a post. Supported formats are JPEG, PNG, and GIF, with a maximum size of 8 MB. Multiple images are supported via the multi-image content type.

Videos: not currently. The LinkedIn video upload API has a more complex flow and is not yet implemented. You can share video URLs as article or link posts.

### What happens if a scheduled post fails?

The scheduler retries up to three times with status tracking. After three failures, it marks the post as `FAILED` and records the error message. You can check failed posts by asking Claude to "list my failed scheduled posts" or by querying the SQLite database directly at `data/scheduler.db`. See [Tools-Reference](Tools-Reference) for the `linkedin_list_scheduled` tool.

---

## Community Management API

### Why do I need two LinkedIn apps?

LinkedIn requires the "Community Management API" product to be the **only** product on a developer app (for legal/security reasons). Since posting requires "Share on LinkedIn" (a different product), you need a separate app for engagement tools (reading comments, post stats, replying, liking).

### Which tools need the second app?

Five tools require the Community Management API app: `linkedin_authenticate_community`, `linkedin_get_comments`, `linkedin_get_post_stats`, `linkedin_reply_to_comment`, and `linkedin_like_post`. All other tools (15 of them) work with the primary app alone.

### Can I skip the second app?

Yes. If you only need posting, scheduling, editing, deleting, searching, and Medium publishing, one app is enough. The 5 engagement tools simply won't appear in Claude Desktop.

### How do I authenticate both apps?

Two separate OAuth flows. Say "Authenticate with LinkedIn" for the primary app (port 3456), then "Authenticate with Community Management API" for the engagement app (port 3457). Each stores tokens in a separate encrypted file.

---

## Related Pages

- [Getting-Started](Getting-Started) -- Initial setup walkthrough
- [Configuration](Configuration) -- Full environment variable reference
- [Tools-Reference](Tools-Reference) -- All 20 MCP tools with parameters and examples
- [Architecture](Architecture) -- System design and component details
- [Troubleshooting](Troubleshooting) -- Error-specific solutions
- [LinkedIn-App-Setup](LinkedIn-App-Setup) -- LinkedIn developer app creation guide
- [Medium-Setup](Medium-Setup) -- Medium integration token setup
- [Telegram-Setup](Telegram-Setup) -- Telegram bot and chat ID configuration
