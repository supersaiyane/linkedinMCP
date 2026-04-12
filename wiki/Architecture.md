---
title: Architecture
sidebar_label: Architecture
sidebar_position: 5
audience: L1-L5
---

# Architecture

**TL;DR:** The AmplifyrMCP is a bridge between Claude Desktop and the LinkedIn, Medium, and Telegram APIs. It uses the MCP SDK for protocol handling, axios for HTTP with retry/rate-limiting, SQLite for scheduling, and AES-256-GCM encryption for token storage. All dependencies are wired manually at startup with no framework.

**Prerequisite knowledge:** Familiarity with client-server architecture, REST APIs, and OAuth 2.0 concepts. Understanding of the MCP (Model Context Protocol) is helpful but not required -- see [Getting Started](Getting-Started) for an introduction.

---

## High-Level Overview

```mermaid
graph TB
    CD[Claude Desktop] -->|MCP Protocol<br/>JSON-RPC over stdio| MCP[AmplifyrMCP]
    RC[Remote Client] -->|MCP Protocol<br/>JSON-RPC over SSE/HTTP| MCP

    MCP -->|HTTPS REST| LI[LinkedIn API<br/>api.linkedin.com]
    MCP -->|HTTPS REST| MD[Medium API<br/>api.medium.com]
    MCP -->|HTTPS| TG[Telegram Bot API<br/>api.telegram.org]

    MCP -->|Read/Write| TE[data/tokens.enc<br/>Primary app tokens]
    MCP -->|Read/Write| CTE[data/community-tokens.enc<br/>Community app tokens]
    MCP -->|Read/Write| SDB[data/scheduler.db<br/>SQLite]

    subgraph LinkedIn API
        LI_POSTS[/rest/posts<br/>create, edit, delete, search]
        LI_SOCIAL[/rest/socialActions<br/>stats, comments, likes]
        LI_IMAGES[/rest/images<br/>upload]
    end

    MCP -->|Primary App<br/>port 3456| LI_POSTS
    MCP -->|Primary App| LI_IMAGES
    MCP -->|Community App<br/>port 3457| LI_SOCIAL
```

The server sits between the MCP client (Claude Desktop or a remote client) and external APIs. It uses a **dual-app architecture** for LinkedIn: a primary app for posting (port 3456) and an optional Community Management API app for engagement (port 3457). This split is required by LinkedIn -- the Community Management API product must be the only product on its app.

It handles authentication, content formatting, rate limiting, retries, scheduling, and notifications so the AI assistant does not need to manage any of that directly.

---

## Component Breakdown

### Entry Point (`src/index.ts`)

The entry point constructs all dependencies in a fixed order and wires them together using manual dependency injection (no framework). The construction order matters because later components depend on earlier ones:

```
Config -> Logger -> TokenStore -> AuthManager -> RateLimiter
  -> LinkedInAPIClient -> MediumClient -> ContentFormatter
  -> MediaHandler -> PostScheduler -> TelegramNotifier -> McpServer
```

Responsibilities:

- Parse CLI arguments (transport mode, log level)
- Load and validate environment configuration via Zod
- Construct the full dependency graph
- Connect the chosen transport (stdio or SSE)
- Register SIGINT and SIGTERM handlers for graceful shutdown

### MCP Server (`src/server.ts`)

Uses `McpServer` from `@modelcontextprotocol/sdk` to register up to 9 tools:

| Tool | Condition | Description |
|---|---|---|
| `linkedin_authenticate` | Always | OAuth 2.0 browser-based login |
| `linkedin_create_post` | Always | Publish a text post |
| `linkedin_publish_article` | Always | Publish an article with source URL |
| `linkedin_upload_media` | Always | Upload an image for use in posts |
| `linkedin_get_profile` | Always | Fetch authenticated user profile |
| `linkedin_schedule_post` | `SCHEDULER_ENABLED=true` | Schedule a post for future publication |
| `linkedin_list_scheduled` | `SCHEDULER_ENABLED=true` | List scheduled posts by status |
| `medium_publish_article` | `MEDIUM_INTEGRATION_TOKEN` set | Publish an article on Medium |
| `medium_get_profile` | `MEDIUM_INTEGRATION_TOKEN` set | Fetch Medium user profile |

Each tool registration provides a name, description, Zod input schema (the SDK converts it to JSON Schema internally), and a handler function. All handlers catch errors and return structured error results rather than throwing.

### Auth System (`src/auth/`)

```
AuthManager
  |
  |-- generateAuthUrl()       Build LinkedIn OAuth URL with state parameter
  |-- authenticate()          Full OAuth flow: URL -> browser -> callback -> tokens
  |-- getValidToken()         Return cached token, refreshing if expired
  |-- refreshAccessToken()    Exchange refresh token for new access token
  |
  +-- TokenStore (interface)
       |
       +-- FileTokenStore     AES-256-GCM encrypted JSON file on disk
       +-- EnvTokenStore      Read-only tokens from environment variables
```

**FileTokenStore:** Encrypts the token JSON with AES-256-GCM before writing to disk. The encryption key is derived via SHA-256 from the `TOKEN_ENCRYPTION_KEY` environment variable. Each save generates a fresh random IV. The file is stored with `0o600` permissions (owner read/write only). The parent directory is created with `0o700` permissions if it does not exist.

**EnvTokenStore:** A read-only store that constructs an `OAuthToken` from `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_REFRESH_TOKEN` environment variables. Used in CI/CD pipelines where browser-based OAuth is not possible. Save and delete operations are no-ops.

**CallbackServer (`src/auth/callback-server.ts`):** A temporary `http.createServer` instance that listens on port 3456 for the OAuth redirect. It validates the state parameter against CSRF attacks, captures the authorization code, shows a confirmation HTML page to the user, and auto-closes with a 120-second timeout. No Express dependency.

### API Clients

**LinkedInAPIClient (`src/api/linkedin-client.ts`):**

Low-level HTTP client for LinkedIn's v2 REST API. Every method follows the same pattern:

1. Check rate limit via `RateLimiter`
2. Obtain a valid token via `AuthManager.getValidToken()` (auto-refreshes if expired)
3. Make HTTP request with `Authorization: Bearer` header and LinkedIn version headers
4. Record the request in the rate limiter
5. Validate the response with a Zod schema
6. Return a typed result

Methods: `getUserProfile()`, `createPost()`, `initializeImageUpload()`, `uploadImageBinary()`, `publishArticle()`.

**MediumClient (`src/api/medium-client.ts`):**

REST client for Medium's API. Only instantiated when `MEDIUM_INTEGRATION_TOKEN` is set. Methods: `getUser()`, `createPost()`. Supports markdown and HTML content, tags (max 5), draft/public/unlisted status, and canonical URLs.

**RateLimiter (`src/api/rate-limiter.ts`):**

In-memory sliding window counter with two buckets:

- `posts`: max N per 24-hour window (default 100)
- `api`: max N per 60-second window (default 150)

Timestamps older than the window are pruned on each check. When a limit is exceeded, a `RateLimitError` is thrown with a `retryAfterSeconds` value. The limiter resets on server restart -- this is acceptable because LinkedIn enforces its own server-side limits.

**Retry Interceptor (`src/api/retry.ts`):**

Axios response interceptor that handles transient failures:

- HTTP 429: Retry after the `Retry-After` header value
- HTTP 500, 502, 503, 504: Exponential backoff (1s base, 2x multiplier, 30s max, random jitter)
- Network errors (ECONNRESET, ETIMEDOUT): Same backoff
- HTTP 401: Thrown immediately as an auth error (no retry)
- Maximum 3 retries

### Services

**ContentFormatter (`src/services/content-formatter.ts`):**

Handles text processing for LinkedIn posts and articles. Appends hashtags with `#` prefix, strips markdown syntax (LinkedIn does not render markdown), validates character limits (3000 for posts, 200 for article titles, max 30 hashtags).

**MediaHandler (`src/services/media-handler.ts`):**

Reads files from disk, detects MIME type from file extension, and validates against LinkedIn's constraints (JPEG/PNG/GIF, max 8MB). Resolves relative paths and `~` home directory paths.

**PostScheduler (`src/services/post-scheduler.ts`):**

SQLite-backed scheduling queue using `better-sqlite3` (synchronous API). Creates the database schema on initialization. A `croner` cron job runs every minute to poll for posts where `status = 'PENDING'` and `scheduled_at <= now`. Each post is attempted up to 3 times before being marked as `FAILED`. Status transitions: `PENDING -> PUBLISHING -> PUBLISHED` or `PENDING -> PUBLISHING -> PENDING (retry)` or `PENDING -> PUBLISHING -> FAILED`.

**TelegramNotifier (`src/services/telegram-notifier.ts`):**

Sends Markdown-formatted notifications via the Telegram Bot API. Used for post-published confirmations and scheduler events. Best-effort delivery -- failures are logged but never throw or block the main operation. Only instantiated when both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set.

### Config (`src/config/`)

**`env.ts`:** Loads environment variables (including from `.env` via dotenv), validates them against a Zod schema, and exports a typed `EnvConfig` object. Fails fast with specific error messages on validation failure.

**`linkedin-api.ts`:** Single source of truth for all LinkedIn API constants: base URLs, auth URLs, token URLs, API version string (`202401`), scopes, endpoint paths, required headers, and content constraints (character limits, file size limits, allowed MIME types). Nothing is hardcoded elsewhere.

### Models (`src/models/`)

**`schemas.ts`:** Zod schemas for all data types: `OAuthToken`, `PostContent`, `ArticleContent`, `UserProfile`, `PostResult`, `ScheduledPost`, and LinkedIn API response shapes (`LinkedInTokenResponse`, `LinkedInImageInitResponse`). TypeScript types are inferred from these schemas.

**`errors.ts`:** Typed error hierarchy. All errors extend `LinkedInMCPError` with a `code` string for programmatic handling. Subtypes include `AuthenticationError`, `TokenExpiredError`, `TokenRefreshError`, `RateLimitError`, `LinkedInAPIError`, `ContentValidationError`, `InvalidMediaError`, `SchedulerError`, `PastDateError`, and `TokenStoreError`.

**`types.ts`:** Re-exports TypeScript types inferred from the Zod schemas in `schemas.ts`.

---

## Data Flow: Creating a Post

This is the step-by-step path when a user asks Claude to create a LinkedIn post:

1. **User sends message** to Claude Desktop: "Post about AI on LinkedIn"
2. **Claude Desktop** decides to call the `linkedin_create_post` tool via the MCP protocol (JSON-RPC over stdio)
3. **MCP SDK** receives the JSON-RPC request, validates the input against the Zod schema, and calls the registered handler
4. **`createPostHandler`** receives the validated arguments and its injected dependencies
5. **ContentFormatter** formats the post text: trims whitespace, appends hashtags (if provided) with `#` prefix, and validates the result (length, hashtag count)
6. **RateLimiter** checks the `posts` bucket. If the 24-hour sliding window limit is exceeded, a `RateLimitError` is thrown with a retry-after value
7. **AuthManager** returns a valid access token. If the current token is expired, it transparently refreshes it using the refresh token, saves the new token, and returns it. If refresh fails, the token file is deleted and an `AuthenticationError` is thrown
8. **LinkedInAPIClient** sends `POST /rest/posts` with the auth header, LinkedIn-Version header, and the formatted post body. The retry interceptor handles transient failures (429, 5xx)
9. **LinkedIn API** returns `201 Created` with the post URN in the `x-restli-id` response header (the body may be empty)
10. **LinkedInAPIClient** constructs the post URL from the URN and returns a `PostResult`
11. **TelegramNotifier** (if configured) sends a best-effort notification with the post URL and a text preview. Failures are logged but do not affect the result
12. **Handler** returns a success result: the post URL and URN
13. **MCP SDK** serializes the result as a JSON-RPC response and writes it to stdout
14. **Claude Desktop** displays the result to the user

---

## Transport Modes

### stdio (Default -- for Claude Desktop)

```
Claude Desktop <--stdin (client->server)--> MCP Server
               <--stdout (server->client)-->
```

- JSON-RPC messages are exchanged over stdin and stdout
- All log output goes to stderr (this is critical -- any non-JSON-RPC data on stdout corrupts the protocol and crashes the client)
- Claude Desktop launches the server as a child process and manages its lifecycle
- The pino logger is configured with `destination: 2` (stderr file descriptor) in stdio mode

### SSE (For Remote Clients)

```
Client --HTTP GET /sse--> MCP Server (port 3001) --SSE stream-->
Client --HTTP POST /messages--> MCP Server
```

- `GET /sse` establishes a Server-Sent Events connection for server-to-client messages
- `POST /messages` sends client-to-server messages
- Logs can go to stdout in SSE mode since stdout is not used for protocol messages
- Set `MCP_TRANSPORT=sse` and optionally `SSE_PORT` to use this mode

---

## File Storage

```
data/
  tokens.enc      Encrypted OAuth tokens (AES-256-GCM)
  scheduler.db    SQLite database for scheduled posts
```

- The `data/` directory is listed in `.gitignore` and is never committed
- Both files are created automatically on first use
- `tokens.enc` has `0o600` file permissions (owner read/write only)
- The `data/` directory is created with `0o700` permissions (owner only)
- Relative paths in `TOKEN_STORE_PATH` and `SCHEDULER_DB_PATH` resolve from the project root (one level up from `dist/`)

### Token File Format

The encrypted token file is a JSON object containing three hex-encoded fields:

```json
{
  "iv": "<16_RANDOM_BYTES_HEX>",
  "tag": "<16_BYTE_AUTH_TAG_HEX>",
  "data": "<ENCRYPTED_TOKEN_JSON_HEX>"
}
```

A fresh random IV is generated on every save operation. The auth tag provides tamper detection -- if the file is modified, decryption will fail with a clear error.

### Scheduler Database Schema

```sql
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL CHECK(content_type IN ('text', 'article')),
  content_json TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'PUBLIC',
  scheduled_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK(status IN ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED')),
  result_url TEXT,
  result_urn TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT
);
```

---

## Design Decisions

### Why axios over fetch

Axios provides an interceptor pipeline that the server uses for two concerns:

1. **Auth injection:** A request interceptor attaches the `Authorization: Bearer` header and LinkedIn version headers to every request
2. **Retry logic:** A response interceptor implements exponential backoff for 429 and 5xx responses

Native `fetch` has no interceptor mechanism. Achieving the same behavior with fetch would require wrapping every call in retry logic, which is more code and harder to maintain.

### Why SQLite (better-sqlite3) for scheduling

The scheduler needs durable, queryable storage for the post queue. SQLite provides this with zero configuration -- no external database server, no connection strings, no Docker containers. The `better-sqlite3` package uses a synchronous API, which is simpler and faster for this use case (the scheduler polls once per minute; async overhead is unnecessary). The database file lives in the `data/` directory alongside the token file.

### Why pino for logging

Pino is the fastest structured JSON logger for Node.js. The critical property for this server is that pino can be configured to write to a specific file descriptor. In stdio mode, all output must go to stderr (file descriptor 2) because stdout is reserved for MCP protocol messages. Pino's `destination: 2` option handles this cleanly. Other loggers (winston, bunyan) default to stdout and require more configuration to redirect.

### Why Zod for validation

Zod serves two roles in this project:

1. **Runtime validation:** All environment variables, tool inputs, and LinkedIn API responses are validated at runtime. External data is never trusted.
2. **Type inference:** TypeScript types are inferred from Zod schemas using `z.infer<>`, which keeps the schema and type definitions in sync without duplication.

The MCP SDK accepts Zod schemas directly for tool input validation, which avoids a manual Zod-to-JSON-Schema conversion step.

### Why manual dependency injection

The dependency graph is small (roughly 10 components) and linear. A DI framework (tsyringe, inversify, etc.) would add complexity without meaningful benefit at this scale. Each component declares its dependencies as constructor parameters, and the entry point wires them together in a fixed order. This makes the startup sequence explicit and easy to follow.

---

## Key Takeaways

- The server is a stateless bridge between MCP clients and external APIs, with two pieces of persistent state: encrypted tokens and the scheduler database.
- All HTTP interactions go through axios with interceptors for auth, rate limiting, and retry.
- Tool handlers are pure functions that receive validated input and injected dependencies, making them independently testable.
- Optional integrations (Medium, Telegram, scheduler) are conditionally instantiated based on environment configuration and conditionally registered as tools.
- In stdio mode, stdout is sacred -- all logs go to stderr.

## Related Pages

- [Getting Started](Getting-Started) -- Installation and first run
- [Configuration](Configuration) -- Environment variable reference
- [Authentication](Authentication) -- OAuth 2.0 flow details
- [Tools Reference](Tools-Reference) -- Complete tool documentation
- [Troubleshooting](Troubleshooting) -- Common issues and fixes
