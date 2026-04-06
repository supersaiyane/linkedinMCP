# Architecture

How the LinkedIn MCP server works under the hood.

## High-Level Overview

```
Claude Desktop
     |
     | MCP Protocol (JSON-RPC over stdio)
     v
+---------------------------+
|    LinkedIn MCP Server    |
|                           |
|  +---------------------+ |
|  |    MCP SDK Layer     | |  <-- Handles protocol, tool registration
|  +---------------------+ |
|  |    Tool Handlers     | |  <-- 9 tools: LinkedIn + Medium
|  +---------------------+ |
|  |     Services         | |  <-- Formatting, scheduling, media, notifications
|  +---------------------+ |
|  |    API Clients       | |  <-- LinkedIn + Medium HTTP, retry, rate limiting
|  +---------------------+ |
|  |    Auth Manager      | |  <-- OAuth 2.0, token lifecycle
|  +---------------------+ |
+---------------------------+
     |
     | HTTPS (REST APIs)
     v
  LinkedIn API  /  Medium API  /  Telegram Bot API
```

## Component Details

### Entry Point (`src/index.ts`)

Constructs all dependencies in order and wires them together (manual dependency injection, no framework):

```
Config -> Logger -> TokenStore -> AuthManager -> RateLimiter -> APIClient -> MediumClient -> Services -> Notifier -> Server
```

Handles:
- CLI argument parsing (transport mode, log level)
- Graceful shutdown on SIGINT/SIGTERM
- Transport setup (stdio or SSE)

### MCP Server (`src/server.ts`)

Uses `@modelcontextprotocol/sdk` to create a `McpServer` instance. Registers all 7 tools with:
- Name and description
- Zod schema for input validation (SDK handles conversion to JSON Schema)
- Handler function that delegates to the appropriate service

### Auth System (`src/auth/`)

```
AuthManager
  |
  |-- generateAuthUrl()      Generate LinkedIn OAuth URL
  |-- startCallbackServer()  Temporary HTTP server on port 3456
  |-- exchangeCode()         POST to LinkedIn token endpoint
  |-- getValidToken()        Return token, refreshing if expired
  |-- refreshAccessToken()   Use refresh token to get new access token
  |
  +-- TokenStore (interface)
       |
       |-- FileTokenStore    AES-256-GCM encrypted file on disk
       |-- EnvTokenStore     Read-only from environment variables
```

**OAuth 2.0 Flow:**
1. Server generates auth URL with client_id, redirect_uri, scopes, random state
2. Browser opens, user logs into LinkedIn and authorizes
3. LinkedIn redirects to `localhost:3456/callback?code=xxx&state=yyy`
4. Callback server validates state, captures authorization code
5. Server exchanges code for tokens via POST to LinkedIn token endpoint
6. Tokens are encrypted and stored via TokenStore

**Token Lifecycle:**
- Access tokens last ~60 days
- Refresh tokens last ~365 days
- `getValidToken()` checks expiry and refreshes automatically
- If refresh fails with 401, tokens are deleted (full re-auth required)

### API Client (`src/api/`)

```
LinkedInAPIClient
  |
  |-- getUserProfile()          GET /v2/userinfo
  |-- createPost()              POST /rest/posts
  |-- initializeImageUpload()   POST /rest/images?action=initializeUpload
  |-- uploadImageBinary()       PUT {uploadUrl}
  |-- publishArticle()          POST /rest/posts (with article content)
  |
  +-- RateLimiter               Sliding window counter
  |    |-- posts: 100/day
  |    |-- api: 150/minute
  |
  +-- RetryInterceptor          Axios response interceptor
       |-- 429: retry after Retry-After header
       |-- 5xx: exponential backoff (1s, 2s, 4s)
       |-- 401: throw immediately (auth issue)
```

**Every API call follows this pattern:**
1. Check rate limit
2. Get valid token (refresh if needed)
3. Make HTTP request with auth headers + LinkedIn version header
4. Record request in rate limiter
5. Validate response with Zod schema
6. Return typed result

### Services (`src/services/`)

**ContentFormatter:**
- Formats post text with hashtags
- Strips markdown for LinkedIn (which doesn't support it)
- Validates content length and constraints

**MediaHandler:**
- Reads files from disk
- Detects MIME type from extension
- Validates file size and format
- Returns buffer ready for upload

**PostScheduler:**
- SQLite database for the scheduling queue
- Cron job runs every minute via `croner`
- Polls for PENDING posts where `scheduled_at <= now`
- Publishes via API client, retries up to 3 times
- Tracks status: PENDING -> PUBLISHING -> PUBLISHED/FAILED

### Config (`src/config/`)

**env.ts:** Loads and validates all environment variables using Zod. Fails fast with clear error messages on startup.

**linkedin-api.ts:** Single source of truth for all LinkedIn API URLs, version headers, endpoints, and constraints. Nothing is hardcoded elsewhere.

### Models (`src/models/`)

**schemas.ts:** Zod schemas for all data types (tokens, posts, articles, profiles, API responses). Types are inferred from schemas.

**errors.ts:** Typed error hierarchy. All errors extend `LinkedInMCPError` with a `code` string for programmatic handling.

## Data Flow: Creating a Post

```
User: "Post about AI on LinkedIn"
  |
  v
Claude Desktop -> MCP Protocol -> server.tool("linkedin_create_post")
  |
  v
createPostHandler(args, deps)
  |
  v
ContentFormatter.formatPost(text, hashtags)
  -> validates length, appends hashtags
  |
  v
RateLimiter.checkLimit("posts")
  -> throws RateLimitError if exceeded
  |
  v
AuthManager.getValidToken()
  -> returns token, refreshing if expired
  |
  v
LinkedInAPIClient.createPost(content)
  -> POST /rest/posts with auth headers
  -> reads post URN from x-restli-id header
  -> constructs post URL
  |
  v
Return: "Post published! URL: https://linkedin.com/..."
  |
  v
TelegramNotifier.notifyPostPublished(url, preview)
  -> best-effort, never blocks
```

## Medium Client (`src/api/medium-client.ts`)

Simple REST client for Medium's API:
- `getUser()` -- GET /v1/me, fetches user ID and profile
- `createPost(input)` -- POST /v1/users/{id}/posts, publishes article

Supports markdown and HTML content, tags (max 5), draft/public/unlisted status, and canonical URLs for cross-posting.

Only instantiated when `MEDIUM_INTEGRATION_TOKEN` is set. Tools don't appear in Claude Desktop without it.

## Telegram Notifier (`src/services/telegram-notifier.ts`)

Sends notifications via the official Telegram Bot API:
- POST `https://api.telegram.org/bot{token}/sendMessage`
- Markdown-formatted messages with links
- Best-effort delivery -- failures are logged but never throw

Only instantiated when both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set. Injected into tool handlers and the scheduler via dependency injection.

## Transport Modes

### stdio (default, for Claude Desktop)

```
Claude Desktop <--stdin/stdout--> MCP Server
```

- JSON-RPC messages on stdout
- All logs go to stderr (critical -- stdout is reserved for protocol)
- Launched by Claude Desktop as a child process

### SSE (for remote clients)

```
Client <--HTTP SSE--> MCP Server (port 3001)
```

- GET /sse establishes SSE connection
- POST /messages sends client messages
- Logs can go to stdout

## File Storage

```
data/
  tokens.enc    Encrypted OAuth tokens (AES-256-GCM)
  scheduler.db  SQLite database for scheduled posts
```

- `data/` is gitignored
- Created automatically on first run
- Token file has 0o600 permissions (owner read/write only)

## Security

- Tokens encrypted at rest with AES-256-GCM
- No tokens logged, even at debug level
- All user input validated with Zod schemas
- All API responses validated with Zod schemas
- Rate limiting prevents accidental API abuse
- OAuth state parameter prevents CSRF
- Callback server auto-closes after use
- Telegram Bot API is official and encrypted (HTTPS)
- Medium integration token stored in env only, never on disk
- Notifications contain only post previews and URLs, never credentials
