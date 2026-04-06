# CLAUDE.md — LinkedIn MCP Server

> **This file is the single source of truth for building this project.**
> Claude Code: read this entire file before writing any code. Follow it precisely.

---

## PROJECT IDENTITY

- **Name:** `linkedin-mcp-server`
- **Purpose:** MCP server that authenticates with LinkedIn OAuth 2.0 and exposes tools for posting text updates, publishing long-form articles, uploading media, reading profile data, and scheduling posts for future publication.
- **Author:** Gurpreet Singh (linkedin.com/in/gurpreettsengh)
- **Runtime:** Node.js 20+ with TypeScript 5.4+
- **Transport:** stdio (primary for Claude Desktop/Code) + SSE HTTP (secondary for remote clients)
- **License:** MIT

---

## GOLDEN RULES

1. **Never hardcode credentials.** All secrets come from env vars or encrypted token store. Never log tokens, even at debug level.
2. **Every tool must be independently testable.** Each tool handler is a pure function that takes validated input and returns a ToolResult.
3. **Fail loud, recover silently.** Throw typed errors with actionable messages. Auto-retry transient failures (429, 5xx) but surface permanent failures immediately.
4. **LinkedIn API versions change.** All API version strings, endpoint paths, and header values live in `src/config/linkedin-api.ts` — never inline them.
5. **The MCP SDK handles protocol.** Never manually construct JSON-RPC responses. Use `@modelcontextprotocol/sdk` server primitives.
6. **One file, one responsibility.** No file exceeds 250 lines. If it does, split it.
7. **Test before commit.** Every PR-worthy change must pass `npm run typecheck && npm run test && npm run lint`.

---

## TECH STACK — EXACT VERSIONS

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "axios": "^1.7.0",
    "better-sqlite3": "^11.0.0",
    "open": "^10.0.0",
    "pino": "^9.0.0",
    "zod": "^3.23.0",
    "croner": "^9.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "msw": "^2.0.0",
    "prettier": "^3.0.0"
  }
}
```

**Why these choices:**
- `@modelcontextprotocol/sdk` — Official Anthropic MCP SDK. Handles JSON-RPC, tool registration, transport abstraction.
- `axios` — HTTP client with interceptors for auth injection and retry logic. Prefer over fetch for its interceptor pipeline.
- `better-sqlite3` — Synchronous SQLite for the scheduler queue. Zero-config, no external DB needed.
- `zod` — Runtime validation for all tool inputs AND LinkedIn API responses. Never trust external data.
- `open` — Opens browser for OAuth callback. Cross-platform.
- `pino` — Structured JSON logging. Fast, minimal.
- `croner` — Cron-based scheduler. Lightweight, no heavy deps.
- `msw` — Mock Service Worker for testing. Intercepts HTTP at network level, not by mocking axios.
- `tsx` — Run TypeScript directly in dev. No build step needed for iteration.

---

## PROJECT STRUCTURE

```
linkedin-mcp-server/
├── CLAUDE.md                          # THIS FILE — agent memory
├── README.md                          # User-facing docs
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.cjs
├── .prettierrc
├── .env.example                       # Template (never .env in repo)
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── Makefile
│
├── src/
│   ├── index.ts                       # Entry point — parse args, init server
│   ├── server.ts                      # LinkedInMCPServer — facade
│   │
│   ├── config/
│   │   ├── env.ts                     # Env var loading + validation with zod
│   │   └── linkedin-api.ts            # All LinkedIn API constants
│   │
│   ├── auth/
│   │   ├── auth-manager.ts            # OAuth 2.0 lifecycle
│   │   ├── callback-server.ts         # Temporary HTTP server for OAuth callback
│   │   ├── token-store.ts             # TokenStore interface
│   │   ├── file-token-store.ts        # AES-256-GCM encrypted file storage
│   │   └── env-token-store.ts         # Read-only from env vars (CI/CD)
│   │
│   ├── api/
│   │   ├── linkedin-client.ts         # Low-level REST client
│   │   ├── rate-limiter.ts            # Sliding window rate limiter
│   │   └── retry.ts                   # Axios retry interceptor
│   │
│   ├── tools/
│   │   ├── index.ts                   # Tool registry — exports all tools
│   │   ├── authenticate.tool.ts       # linkedin_authenticate
│   │   ├── create-post.tool.ts        # linkedin_create_post
│   │   ├── publish-article.tool.ts    # linkedin_publish_article
│   │   ├── upload-media.tool.ts       # linkedin_upload_media
│   │   ├── get-profile.tool.ts        # linkedin_get_profile
│   │   ├── schedule-post.tool.ts      # linkedin_schedule_post
│   │   └── list-scheduled.tool.ts     # linkedin_list_scheduled
│   │
│   ├── services/
│   │   ├── content-formatter.ts       # Text/markdown processing
│   │   ├── post-scheduler.ts          # SQLite queue + cron dispatcher
│   │   └── media-handler.ts           # File reading, MIME detection, size validation
│   │
│   ├── models/
│   │   ├── schemas.ts                 # Zod schemas for ALL data types
│   │   ├── errors.ts                  # Error class hierarchy
│   │   └── types.ts                   # TypeScript type exports (inferred from zod)
│   │
│   └── utils/
│       ├── logger.ts                  # Pino logger factory
│       ├── crypto.ts                  # AES-256-GCM encrypt/decrypt helpers
│       └── id.ts                      # UUID generation
│
├── tests/
│   ├── setup.ts                       # MSW server setup, test fixtures
│   ├── auth/
│   │   ├── auth-manager.test.ts
│   │   └── file-token-store.test.ts
│   ├── api/
│   │   ├── linkedin-client.test.ts
│   │   └── rate-limiter.test.ts
│   ├── tools/
│   │   ├── create-post.test.ts
│   │   ├── publish-article.test.ts
│   │   └── schedule-post.test.ts
│   ├── services/
│   │   ├── content-formatter.test.ts
│   │   └── post-scheduler.test.ts
│   └── fixtures/
│       ├── tokens.json
│       ├── profile-response.json
│       └── post-response.json
│
├── scripts/
│   └── setup-linkedin-app.md          # Step-by-step LinkedIn developer app setup guide
│
└── data/                              # Runtime (gitignored)
    ├── tokens.enc                     # Encrypted OAuth tokens
    └── scheduler.db                   # SQLite scheduler queue
```

---

## IMPLEMENTATION SPECIFICATIONS

### src/index.ts — Entry Point

```typescript
// Responsibilities:
// 1. Load and validate env config
// 2. Instantiate all dependencies (DI without framework)
// 3. Create LinkedInMCPServer
// 4. Connect transport (stdio or SSE based on env)
// 5. Handle graceful shutdown (SIGINT, SIGTERM)

// CLI args:
//   --transport=stdio (default) | --transport=sse --port=3001
//   --log-level=info (default) | debug | warn | error

// Dependency construction order:
// 1. Config (env.ts)
// 2. Logger (pino)
// 3. TokenStore (file or env based on config)
// 4. AuthManager(tokenStore)
// 5. RateLimiter()
// 6. LinkedInAPIClient(authManager, rateLimiter)
// 7. ContentFormatter()
// 8. PostScheduler(apiClient, db)
// 9. LinkedInMCPServer(all of the above)
```

---

### src/server.ts — LinkedInMCPServer

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// This class:
// 1. Creates McpServer instance with name "linkedin-mcp" and version from package.json
// 2. Registers all tools via server.tool() calls
// 3. Each tool registration includes: name, description, zod schema, handler function
// 4. Handler functions delegate to the appropriate service/tool module
// 5. All handlers catch errors and return { isError: true, content: [...] } on failure

// Tool registration pattern (FOLLOW THIS EXACTLY):
//
// server.tool(
//   "linkedin_create_post",
//   "Create a text post on LinkedIn with optional hashtags and visibility control.",
//   {
//     text: z.string().min(1).max(3000).describe("Post content (max 3000 characters)"),
//     visibility: z.enum(["PUBLIC", "CONNECTIONS"]).default("PUBLIC").describe("Post visibility"),
//     hashtags: z.array(z.string()).optional().describe("Hashtags to append (without # prefix)")
//   },
//   async (args) => {
//     // delegate to createPostHandler(args, { apiClient, contentFormatter, ... })
//   }
// );

// IMPORTANT: The McpServer from the SDK uses zod schemas directly — do NOT convert to JSON Schema.
// The SDK handles the conversion internally.

// Server metadata:
// - name: "linkedin-mcp"
// - version: read from package.json
// - capabilities: { tools: {} }
```

---

### src/config/env.ts — Environment Configuration

```typescript
// Use zod to validate ALL env vars at startup. Fail fast with clear messages.

const EnvSchema = z.object({
  // LinkedIn OAuth (REQUIRED)
  LINKEDIN_CLIENT_ID: z.string().min(1, "LINKEDIN_CLIENT_ID is required"),
  LINKEDIN_CLIENT_SECRET: z.string().min(1, "LINKEDIN_CLIENT_SECRET is required"),
  LINKEDIN_REDIRECT_URI: z.string().url().default("http://localhost:3456/callback"),

  // Token storage
  TOKEN_STORE_TYPE: z.enum(["file", "env"]).default("file"),
  TOKEN_STORE_PATH: z.string().default("./data/tokens.enc"),
  TOKEN_ENCRYPTION_KEY: z.string().min(32, "Encryption key must be at least 32 chars")
    .default("CHANGE_ME_IN_PRODUCTION_32CHARS!!"),  // force user to change

  // If TOKEN_STORE_TYPE=env, read tokens directly:
  LINKEDIN_ACCESS_TOKEN: z.string().optional(),
  LINKEDIN_REFRESH_TOKEN: z.string().optional(),

  // Server
  MCP_TRANSPORT: z.enum(["stdio", "sse"]).default("stdio"),
  SSE_PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Scheduler
  SCHEDULER_ENABLED: z.coerce.boolean().default(true),
  SCHEDULER_DB_PATH: z.string().default("./data/scheduler.db"),

  // Rate limiting overrides
  RATE_LIMIT_POSTS_PER_DAY: z.coerce.number().default(100),
  RATE_LIMIT_API_PER_MINUTE: z.coerce.number().default(150),
});

// Export parsed config. If validation fails, log which vars are missing/invalid and exit(1).
```

---

### src/config/linkedin-api.ts — LinkedIn API Constants

```typescript
// ALL LinkedIn API details live here. NEVER inline URLs, headers, or version strings.

export const LINKEDIN_API = {
  BASE_URL: "https://api.linkedin.com",
  AUTH_URL: "https://www.linkedin.com/oauth/v2/authorization",
  TOKEN_URL: "https://www.linkedin.com/oauth/v2/accessToken",

  // API Version — LinkedIn requires this header on all v2 REST calls
  VERSION: "202401",

  // Scopes
  SCOPES: ["openid", "profile", "w_member_social"],

  // Endpoints (all relative to BASE_URL)
  ENDPOINTS: {
    ME: "/v2/userinfo",
    POSTS: "/rest/posts",
    IMAGES_INIT: "/rest/images?action=initializeUpload",
    DOCUMENTS_INIT: "/rest/documents?action=initializeUpload",
  },

  // Required headers for all REST API calls
  DEFAULT_HEADERS: {
    "LinkedIn-Version": "202401",
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  },

  // Constraints
  LIMITS: {
    POST_TEXT_MAX_CHARS: 3000,
    ARTICLE_TITLE_MAX_CHARS: 200,
    HASHTAGS_MAX: 30,
    IMAGE_MAX_SIZE_BYTES: 8 * 1024 * 1024,  // 8 MB
    DOCUMENT_MAX_SIZE_BYTES: 100 * 1024 * 1024,  // 100 MB
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif"],
    ALLOWED_DOC_TYPES: ["application/pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  },

  // OAuth callback server
  CALLBACK_PORT: 3456,
  CALLBACK_PATH: "/callback",
} as const;
```

---

### src/auth/auth-manager.ts — OAuth 2.0 Lifecycle

```typescript
// AuthManager handles the COMPLETE OAuth 2.0 authorization code flow.
//
// FLOW:
// 1. generateAuthUrl(state) → returns LinkedIn authorization URL
// 2. startCallbackServer() → spins up temporary HTTP server on CALLBACK_PORT
// 3. User approves in browser → LinkedIn redirects to callback with ?code=xxx&state=yyy
// 4. exchangeCodeForToken(code) → POST to TOKEN_URL with code, client_id, client_secret, redirect_uri
// 5. Store token via TokenStore
// 6. Shut down callback server
//
// TOKEN REFRESH:
// - getValidToken() checks expiry. If expired, calls refreshAccessToken().
// - LinkedIn refresh tokens last ~365 days. Access tokens last ~60 days.
// - If refresh fails with 401, token is deleted and full re-auth is required.
//
// CRITICAL IMPLEMENTATION DETAILS:
//
// Authorization URL format:
//   https://www.linkedin.com/oauth/v2/authorization
//     ?response_type=code
//     &client_id={LINKEDIN_CLIENT_ID}
//     &redirect_uri={LINKEDIN_REDIRECT_URI}  (URL-encoded)
//     &scope=openid%20profile%20w_member_social
//     &state={random_uuid}
//
// Token exchange request (POST, application/x-www-form-urlencoded):
//   grant_type=authorization_code
//   &code={authorization_code}
//   &client_id={LINKEDIN_CLIENT_ID}
//   &client_secret={LINKEDIN_CLIENT_SECRET}
//   &redirect_uri={LINKEDIN_REDIRECT_URI}
//
// Token exchange response:
//   {
//     "access_token": "AQV...",
//     "expires_in": 5184000,          // seconds (60 days)
//     "refresh_token": "AQX...",
//     "refresh_token_expires_in": 31536000,  // seconds (365 days)
//     "scope": "openid,profile,w_member_social"
//   }
//
// Token refresh request (POST, application/x-www-form-urlencoded):
//   grant_type=refresh_token
//   &refresh_token={refresh_token}
//   &client_id={LINKEDIN_CLIENT_ID}
//   &client_secret={LINKEDIN_CLIENT_SECRET}
//
// IMPORTANT: Content-Type for token exchange is application/x-www-form-urlencoded, NOT JSON.
// Use URLSearchParams or querystring to encode the body.

export class AuthManager {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
    private tokenStore: TokenStore,
    private logger: Logger,
  ) {}

  async getValidToken(): Promise<OAuthToken> {
    const token = await this.tokenStore.load();
    if (!token) throw new AuthenticationError("Not authenticated. Call linkedin_authenticate first.");
    if (this.isExpired(token)) {
      this.logger.info("Access token expired, refreshing...");
      return this.refreshAccessToken(token.refreshToken);
    }
    return token;
  }

  // ... other methods as described
}
```

---

### src/auth/callback-server.ts — OAuth Callback Handler

```typescript
// Creates a TEMPORARY http.createServer that:
// 1. Listens on CALLBACK_PORT (default 3456)
// 2. Handles GET /callback?code=xxx&state=yyy
// 3. Validates state parameter matches what was generated
// 4. Returns the authorization code via a Promise
// 5. Shows a "You can close this window" HTML page to the user
// 6. Auto-closes after receiving the callback (30 second timeout)
//
// This is a bare Node.js http server — NO express dependency needed.
//
// Response HTML on success:
//   <html><body><h1>✅ LinkedIn Connected!</h1>
//   <p>You can close this window and return to your terminal.</p></body></html>
//
// Response HTML on error:
//   <html><body><h1>❌ Authentication Failed</h1>
//   <p>Error: {error_description}</p></body></html>
//
// The server MUST be destroyed after use. Do not leave orphan listeners.
```

---

### src/auth/file-token-store.ts — Encrypted Token Persistence

```typescript
// Implements TokenStore interface.
// Stores tokens as AES-256-GCM encrypted JSON file.
//
// File format (on disk):
//   {
//     "iv": "<hex>",
//     "tag": "<hex>",
//     "data": "<hex>"    // encrypted JSON of OAuthToken
//   }
//
// Use Node.js crypto module:
//   - Algorithm: aes-256-gcm
//   - Key: SHA-256 hash of TOKEN_ENCRYPTION_KEY (produces 32 bytes)
//   - IV: Random 16 bytes per save (stored alongside)
//   - Auth tag: 16 bytes (stored alongside)
//
// On load():
//   1. Read file, parse outer JSON
//   2. Decrypt data using key, iv, tag
//   3. Parse decrypted JSON as OAuthToken
//   4. Validate with zod schema
//
// On save():
//   1. Serialize OAuthToken to JSON
//   2. Generate random IV
//   3. Encrypt with AES-256-GCM
//   4. Write { iv, tag, data } JSON to file
//   5. Set file permissions to 0o600 (owner read/write only)
//
// On delete():
//   1. Unlink file if it exists
//
// If file doesn't exist, load() returns null (not an error — means not authenticated yet).
// If file is corrupt or key is wrong, throw TokenStoreError with clear message.
//
// IMPORTANT: Create parent directories (data/) if they don't exist. Use fs.mkdirSync with recursive: true.
```

---

### src/api/linkedin-client.ts — LinkedIn REST API Client

```typescript
// Low-level HTTP client for LinkedIn API v2.
// Uses axios with interceptors for auth injection and retry.
//
// Constructor dependencies: AuthManager, RateLimiter, Logger
//
// EVERY method follows this pattern:
//   1. rateLimiter.checkLimit("operation_name") — throws RateLimitError if exceeded
//   2. const token = await authManager.getValidToken()
//   3. Make HTTP request with auth + LinkedIn headers
//   4. rateLimiter.recordRequest("operation_name")
//   5. Validate response with zod schema
//   6. Return typed result
//
// ═══════════════════════════════════════════════════════
// METHOD: getUserProfile()
// ═══════════════════════════════════════════════════════
//
// GET /v2/userinfo
// Headers: Authorization: Bearer {token}
//
// Response (validate with zod):
// {
//   "sub": "abc123",              // This is the member ID — used as person URN
//   "name": "Gurpreet Singh",
//   "given_name": "Gurpreet",
//   "family_name": "Singh",
//   "picture": "https://...",
//   "email": "...",               // only if email scope granted
//   "email_verified": true
// }
//
// The "sub" field is the MEMBER ID. The person URN is constructed as:
//   urn:li:person:{sub}
//
// Cache this URN after first fetch — it's needed for every post.
// Store it on the client instance: this.memberUrn = `urn:li:person:${profile.sub}`;
//
// ═══════════════════════════════════════════════════════
// METHOD: createPost(content: PostContent)
// ═══════════════════════════════════════════════════════
//
// POST /rest/posts
// Headers: Authorization + LINKEDIN_API.DEFAULT_HEADERS
//
// Request body:
// {
//   "author": "urn:li:person:{member_id}",
//   "commentary": "Post text here #hashtag1 #hashtag2",
//   "visibility": "PUBLIC",
//   "distribution": {
//     "feedDistribution": "MAIN_FEED",
//     "targetEntities": [],
//     "thirdPartyDistributionChannels": []
//   },
//   "lifecycleState": "PUBLISHED"
// }
//
// If post has images, add content object:
// {
//   ...above fields,
//   "content": {
//     "media": {
//       "title": "Image",
//       "id": "urn:li:image:{asset_id}"
//     }
//   }
// }
//
// If post has multiple images, use multiImage instead:
// {
//   ...above fields,
//   "content": {
//     "multiImage": {
//       "images": [
//         { "id": "urn:li:image:{asset_id_1}", "altText": "..." },
//         { "id": "urn:li:image:{asset_id_2}", "altText": "..." }
//       ]
//     }
//   }
// }
//
// If posting an article:
// {
//   ...above fields,
//   "content": {
//     "article": {
//       "source": "https://your-article-url.com",  // required
//       "title": "Article Title",
//       "description": "Article description",
//       "thumbnail": "urn:li:image:{id}"  // optional cover image
//     }
//   }
// }
//
// Success response: 201 Created
// Headers include: x-restli-id (the post URN, e.g., "urn:li:share:12345")
// Response body may be empty on 201. The post URN comes from the header.
//
// Construct post URL:
//   const postUrn = response.headers["x-restli-id"];
//   const activityId = postUrn.split(":").pop();
//   const postUrl = `https://www.linkedin.com/feed/update/${postUrn}/`;
//
// ═══════════════════════════════════════════════════════
// METHOD: initializeImageUpload()
// ═══════════════════════════════════════════════════════
//
// POST /rest/images?action=initializeUpload
// Headers: Authorization + DEFAULT_HEADERS
//
// Request body:
// {
//   "initializeUploadRequest": {
//     "owner": "urn:li:person:{member_id}"
//   }
// }
//
// Response:
// {
//   "value": {
//     "uploadUrlExpiresAt": 1234567890000,
//     "uploadUrl": "https://www.linkedin.com/dms-uploads/...",
//     "image": "urn:li:image:D4E10..."
//   }
// }
//
// ═══════════════════════════════════════════════════════
// METHOD: uploadImageBinary(uploadUrl: string, data: Buffer, mimeType: string)
// ═══════════════════════════════════════════════════════
//
// PUT {uploadUrl}
// Headers:
//   Authorization: Bearer {token}
//   Content-Type: {mimeType}  (NOT application/json)
//
// Body: Raw binary buffer
//
// Response: 201 Created (empty body)
//
// The full image upload flow is:
//   1. initializeImageUpload() → get uploadUrl + image URN
//   2. uploadImageBinary(uploadUrl, buffer, mime) → upload binary
//   3. Return the image URN for use in createPost()
//
// ═══════════════════════════════════════════════════════
// METHOD: publishArticle(article: ArticleContent)
// ═══════════════════════════════════════════════════════
//
// LinkedIn does NOT have a native "create article" API endpoint anymore
// (the old UGC Articles API was deprecated). Instead, articles are posted
// as share posts with an article content attachment.
//
// To create a LinkedIn article-style post:
//   1. If cover image provided, upload it first
//   2. Create a post with content.article object
//   3. The "source" URL is REQUIRED — it must be a valid URL
//
// For publishing original content without an external URL:
//   - Create the content as a long text post (up to 3000 chars)
//   - OR use commentary with article attachment where source is the user's LinkedIn profile
//
// IMPORTANT: LinkedIn's v2 API requires a source URL for article posts.
// If user provides only markdown content with no URL, format it as a rich text
// post instead. Log a warning explaining the limitation.
```

---

### src/api/rate-limiter.ts — Sliding Window Rate Limiter

```typescript
// Implements sliding window counter algorithm.
//
// Two rate limit buckets:
//   1. "posts" — max RATE_LIMIT_POSTS_PER_DAY per 24 hours
//   2. "api" — max RATE_LIMIT_API_PER_MINUTE per 60 seconds
//
// Data structure:
//   Map<string, number[]> where value is array of timestamps (Date.now())
//
// checkLimit(operation):
//   1. Get timestamps for this operation
//   2. Filter out timestamps older than the window
//   3. If remaining count >= max, throw RateLimitError with retryAfter
//   4. Else return true
//
// recordRequest(operation):
//   1. Push Date.now() to the timestamps array
//
// getRetryAfter(operation):
//   1. Find the oldest timestamp in the window
//   2. Return (windowMs - (now - oldest)) / 1000 in seconds
//
// The rate limiter is IN-MEMORY ONLY. It resets on server restart.
// This is acceptable because LinkedIn has its own server-side rate limits
// that will return 429 if exceeded.
```

---

### src/api/retry.ts — Axios Retry Interceptor

```typescript
// Axios response interceptor for retry logic.
//
// Retry conditions:
//   - HTTP 429 (Too Many Requests): retry after Retry-After header value
//   - HTTP 500, 502, 503, 504: retry with exponential backoff
//   - Network errors (ECONNRESET, ETIMEDOUT): retry with backoff
//
// Retry config:
//   - maxRetries: 3
//   - initialDelayMs: 1000
//   - maxDelayMs: 30000
//   - backoffMultiplier: 2
//   - jitterMs: random(0, 500)  // prevents thundering herd
//
// Implementation:
//   Store retry count on the axios config object: config.__retryCount = (config.__retryCount || 0) + 1
//   If __retryCount > maxRetries, reject with the original error
//   Else, delay and retry with axios(config)
//
// IMPORTANT: Token refresh is handled by AuthManager, NOT by the retry interceptor.
// If we get a 401, throw AuthenticationError immediately — don't retry.
```

---

### src/tools/ — Tool Implementations

Each tool file exports a function that is called by server.ts during tool registration.

```typescript
// ══════════════════════════════════════════════════════════════
// TOOL FILE PATTERN — every .tool.ts file follows this structure:
// ══════════════════════════════════════════════════════════════

// src/tools/create-post.tool.ts

import { z } from "zod";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";
import type { ContentFormatter } from "../services/content-formatter.js";
import type { Logger } from "pino";

// 1. Define the input schema (used by server.ts for registration)
export const createPostSchema = {
  text: z.string().min(1, "Post text cannot be empty").max(3000, "Post text cannot exceed 3000 characters"),
  visibility: z.enum(["PUBLIC", "CONNECTIONS"]).default("PUBLIC"),
  hashtags: z.array(z.string().regex(/^[a-zA-Z0-9]+$/, "Hashtags must be alphanumeric without #"))
    .max(30).optional(),
};

// 2. Define the handler
export async function createPostHandler(
  args: z.infer<z.ZodObject<typeof createPostSchema>>,
  deps: { apiClient: LinkedInAPIClient; contentFormatter: ContentFormatter; logger: Logger }
) {
  const { apiClient, contentFormatter, logger } = deps;

  // Format content (appends hashtags to text)
  const content = contentFormatter.formatPost(args.text, args.hashtags);

  // Validate
  const validation = contentFormatter.validatePost(content);
  if (!validation.valid) {
    return {
      content: [{ type: "text" as const, text: `❌ Validation failed: ${validation.errors.join(", ")}` }],
      isError: true,
    };
  }

  // Post to LinkedIn
  const result = await apiClient.createPost({
    ...content,
    visibility: args.visibility,
  });

  logger.info({ postUrn: result.urn }, "Post created successfully");

  return {
    content: [{
      type: "text" as const,
      text: `✅ Post published successfully!\n\n🔗 ${result.url}\n📝 URN: ${result.urn}`,
    }],
  };
}

// ══════════════════════════════════════════════════════════════
// TOOL: linkedin_authenticate
// ══════════════════════════════════════════════════════════════
//
// Input: {} (no args)
// Behavior:
//   1. Check if valid token already exists → if yes, return profile info
//   2. Generate auth URL with random state
//   3. Start callback server
//   4. Open browser with auth URL (using `open` package)
//   5. Also return the URL as text in case browser doesn't open
//   6. Wait for callback (30s timeout)
//   7. Exchange code for tokens
//   8. Store tokens
//   9. Fetch and return profile info
// Output: "✅ Authenticated as {name} ({headline})"
// Error: "❌ Authentication failed: {reason}"

// ══════════════════════════════════════════════════════════════
// TOOL: linkedin_create_post
// ══════════════════════════════════════════════════════════════
//
// Input: { text: string, visibility?: "PUBLIC"|"CONNECTIONS", hashtags?: string[] }
// Behavior:
//   1. Format text (append hashtags if provided)
//   2. Validate length and content
//   3. Check rate limit
//   4. POST to LinkedIn
// Output: "✅ Post published!\n🔗 {url}"
// Error: Validation errors, rate limit errors, API errors

// ══════════════════════════════════════════════════════════════
// TOOL: linkedin_publish_article
// ══════════════════════════════════════════════════════════════
//
// Input: {
//   title: string,
//   body: string (markdown content),
//   source_url: string (REQUIRED — URL of the article),
//   cover_image_path?: string (local file path),
//   visibility?: "PUBLIC"|"CONNECTIONS"
// }
// Behavior:
//   1. Validate title (max 200 chars) and body
//   2. If cover_image_path, upload via media handler
//   3. Create article post with source URL
// Output: "✅ Article published!\n📰 {title}\n🔗 {url}"
// Note: If no source_url, format as long text post instead and warn user

// ══════════════════════════════════════════════════════════════
// TOOL: linkedin_upload_media
// ══════════════════════════════════════════════════════════════
//
// Input: { file_path: string, alt_text?: string }
// Behavior:
//   1. Read file, detect MIME type, validate size
//   2. Initialize upload with LinkedIn
//   3. Upload binary
//   4. Return image URN
// Output: "✅ Image uploaded!\n🖼️ URN: {urn}\nUse this URN when creating posts with images."

// ══════════════════════════════════════════════════════════════
// TOOL: linkedin_get_profile
// ══════════════════════════════════════════════════════════════
//
// Input: {} (no args)
// Behavior: Fetch and return profile info
// Output: Formatted profile card with name, headline, URN

// ══════════════════════════════════════════════════════════════
// TOOL: linkedin_schedule_post
// ══════════════════════════════════════════════════════════════
//
// Input: {
//   text: string,
//   scheduled_time: string (ISO 8601),
//   visibility?: "PUBLIC"|"CONNECTIONS",
//   hashtags?: string[]
// }
// Behavior:
//   1. Validate scheduled_time is in the future (at least 5 min from now)
//   2. Validate content same as create_post
//   3. Insert into scheduler SQLite DB
//   4. Return confirmation with scheduled time
// Output: "✅ Post scheduled for {time}\n🆔 {schedule_id}"

// ══════════════════════════════════════════════════════════════
// TOOL: linkedin_list_scheduled
// ══════════════════════════════════════════════════════════════
//
// Input: { status?: "PENDING"|"PUBLISHED"|"FAILED" }
// Behavior: Query scheduler DB, return formatted list
// Output: Formatted table of scheduled posts with status
```

---

### src/services/content-formatter.ts

```typescript
// ContentFormatter handles all text processing:
//
// formatPost(text, hashtags?):
//   1. Trim whitespace
//   2. If hashtags provided, append "\n\n" + hashtags.map(h => `#${h}`).join(" ")
//   3. Return PostContent object
//
// formatArticle(title, markdown):
//   1. Trim title
//   2. Convert markdown to clean text (strip markdown syntax)
//      - LinkedIn doesn't support markdown in posts
//      - Use basic regex replacements: **bold** → bold, [link](url) → link (url), etc.
//   3. Return ArticleContent object
//
// validatePost(content):
//   1. Check text length <= 3000
//   2. Check not empty after trim
//   3. Check hashtag count <= 30
//   4. Return { valid: boolean, errors: string[] }
//
// validateArticle(article):
//   1. Check title length <= 200
//   2. Check title not empty
//   3. Check body not empty
//   4. Return { valid: boolean, errors: string[] }
//
// extractHashtags(text):
//   - Regex: /#([a-zA-Z0-9_]+)/g
//   - Return array of hashtag strings (without #)
//   - Used for analytics, not for formatting
```

---

### src/services/post-scheduler.ts

```typescript
// PostScheduler manages the SQLite-based scheduling queue.
//
// SQLite schema (create on init):
//
// CREATE TABLE IF NOT EXISTS scheduled_posts (
//   id TEXT PRIMARY KEY,
//   content_type TEXT NOT NULL CHECK(content_type IN ('text', 'article')),
//   content_json TEXT NOT NULL,
//   visibility TEXT NOT NULL DEFAULT 'PUBLIC',
//   scheduled_at TEXT NOT NULL,       -- ISO 8601
//   created_at TEXT NOT NULL,         -- ISO 8601
//   status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED')),
//   result_url TEXT,
//   result_urn TEXT,
//   error_message TEXT,
//   attempt_count INTEGER NOT NULL DEFAULT 0,
//   last_attempt_at TEXT
// );
//
// CREATE INDEX IF NOT EXISTS idx_scheduled_status ON scheduled_posts(status, scheduled_at);
//
// Methods:
//
// schedule(content, scheduledAt) → ScheduledPost
//   1. Validate scheduledAt is in future
//   2. Generate UUID
//   3. INSERT into scheduled_posts
//   4. Return ScheduledPost
//
// poll() — called by cron every minute
//   1. SELECT * FROM scheduled_posts WHERE status = 'PENDING' AND scheduled_at <= datetime('now')
//   2. For each: UPDATE status = 'PUBLISHING', attempt_count += 1
//   3. Attempt to publish via apiClient
//   4. On success: UPDATE status = 'PUBLISHED', result_url = ..., result_urn = ...
//   5. On failure: if attempt_count < 3, UPDATE status = 'PENDING' (will retry next poll)
//                  else UPDATE status = 'FAILED', error_message = ...
//
// cancel(id) → void
//   1. UPDATE status = 'CANCELLED' WHERE id = ? AND status = 'PENDING'
//   2. If no rows affected, throw SchedulerError("Post not found or already processed")
//
// listPending(status?) → ScheduledPost[]
//   1. SELECT with optional status filter, ORDER BY scheduled_at ASC
//
// start() — begins the cron loop
//   Uses croner: new Cron("* * * * *", () => this.poll())
//
// stop() — stops the cron loop
//   cron.stop()
//
// Use better-sqlite3 synchronous API — it's faster and simpler for this use case.
// All DB operations are wrapped in try/catch with SchedulerError.
```

---

### src/services/media-handler.ts

```typescript
// MediaHandler reads files and prepares them for LinkedIn upload.
//
// processImage(filePath):
//   1. Verify file exists (fs.accessSync)
//   2. Read file into Buffer
//   3. Detect MIME type from file extension (map: .jpg→image/jpeg, .png→image/png, .gif→image/gif)
//   4. Validate MIME is in ALLOWED_IMAGE_TYPES
//   5. Validate size <= IMAGE_MAX_SIZE_BYTES
//   6. Return { buffer: Buffer, mimeType: string, sizeBytes: number }
//
// If file doesn't exist: throw ContentError("File not found: {path}")
// If invalid type: throw InvalidMediaError("Unsupported image type: {mime}. Allowed: jpeg, png, gif")
// If too large: throw InvalidMediaError("Image too large: {sizeMB}MB. Maximum: 8MB")
//
// IMPORTANT: File paths may be absolute or relative. Resolve with path.resolve().
// Handle ~ expansion for home directory paths.
```

---

### src/models/schemas.ts — Zod Schemas

```typescript
import { z } from "zod";

// ═══ OAuth Token ═══
export const OAuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),           // Unix timestamp (seconds)
  refreshExpiresAt: z.number(),    // Unix timestamp (seconds)
  scopes: z.array(z.string()),
  memberUrn: z.string().optional(), // cached after first profile fetch
});

// ═══ Post Content ═══
export const PostContentSchema = z.object({
  text: z.string().min(1).max(3000),
  visibility: z.enum(["PUBLIC", "CONNECTIONS"]).default("PUBLIC"),
  mediaUrns: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
});

// ═══ Article Content ═══
export const ArticleContentSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  sourceUrl: z.string().url(),
  coverImageUrn: z.string().optional(),
  visibility: z.enum(["PUBLIC", "CONNECTIONS"]).default("PUBLIC"),
});

// ═══ User Profile ═══
export const UserProfileSchema = z.object({
  sub: z.string(),
  name: z.string(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  picture: z.string().url().optional(),
  email: z.string().email().optional(),
});

// ═══ Post Result ═══
export const PostResultSchema = z.object({
  urn: z.string(),
  url: z.string().url(),
});

// ═══ Scheduled Post ═══
export const ScheduledPostSchema = z.object({
  id: z.string().uuid(),
  contentType: z.enum(["text", "article"]),
  contentJson: z.string(),  // JSON stringified PostContent or ArticleContent
  visibility: z.string(),
  scheduledAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  status: z.enum(["PENDING", "PUBLISHING", "PUBLISHED", "FAILED", "CANCELLED"]),
  resultUrl: z.string().nullable().optional(),
  resultUrn: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  attemptCount: z.number().default(0),
});

// ═══ LinkedIn API Responses (for validation) ═══
export const LinkedInTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  refresh_token_expires_in: z.number().optional(),
  scope: z.string(),
});

export const LinkedInImageInitResponseSchema = z.object({
  value: z.object({
    uploadUrlExpiresAt: z.number(),
    uploadUrl: z.string().url(),
    image: z.string(),  // urn:li:image:xxx
  }),
});

// Export types inferred from schemas
export type OAuthToken = z.infer<typeof OAuthTokenSchema>;
export type PostContent = z.infer<typeof PostContentSchema>;
export type ArticleContent = z.infer<typeof ArticleContentSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type PostResult = z.infer<typeof PostResultSchema>;
export type ScheduledPost = z.infer<typeof ScheduledPostSchema>;
```

---

### src/models/errors.ts — Error Hierarchy

```typescript
// All errors extend LinkedInMCPError.
// Each error has: message, code (string enum), and optional metadata.

export class LinkedInMCPError extends Error {
  constructor(message: string, public code: string, public metadata?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Auth errors
export class AuthenticationError extends LinkedInMCPError {
  constructor(message: string) { super(message, "AUTH_ERROR"); }
}
export class TokenExpiredError extends LinkedInMCPError {
  constructor() { super("Access token has expired", "TOKEN_EXPIRED"); }
}
export class TokenRefreshError extends LinkedInMCPError {
  constructor(reason: string) { super(`Token refresh failed: ${reason}`, "TOKEN_REFRESH_FAILED"); }
}

// API errors
export class RateLimitError extends LinkedInMCPError {
  constructor(public retryAfterSeconds: number) {
    super(`Rate limit exceeded. Retry after ${retryAfterSeconds}s`, "RATE_LIMIT", { retryAfterSeconds });
  }
}
export class LinkedInAPIError extends LinkedInMCPError {
  constructor(public statusCode: number, message: string, public responseBody?: unknown) {
    super(`LinkedIn API error (${statusCode}): ${message}`, "API_ERROR", { statusCode, responseBody });
  }
}

// Content errors
export class ContentValidationError extends LinkedInMCPError {
  constructor(public errors: string[]) {
    super(`Content validation failed: ${errors.join(", ")}`, "VALIDATION_ERROR", { errors });
  }
}
export class InvalidMediaError extends LinkedInMCPError {
  constructor(reason: string) { super(reason, "INVALID_MEDIA"); }
}

// Scheduler errors
export class SchedulerError extends LinkedInMCPError {
  constructor(message: string) { super(message, "SCHEDULER_ERROR"); }
}
export class PastDateError extends LinkedInMCPError {
  constructor() { super("Scheduled time must be at least 5 minutes in the future", "PAST_DATE"); }
}

// Token store errors
export class TokenStoreError extends LinkedInMCPError {
  constructor(message: string) { super(message, "TOKEN_STORE_ERROR"); }
}
```

---

### src/utils/logger.ts

```typescript
// Factory function that creates a pino logger instance.
// Config:
//   - level: from env LOG_LEVEL
//   - transport: for stdio MCP, log to stderr (stdout is for MCP protocol)
//                for SSE, log to stdout is fine
//   - base: { service: "linkedin-mcp", version: "1.0.0" }
//   - timestamp: pino.stdTimeFunctions.isoTime
//
// CRITICAL: When using stdio transport, ALL logs MUST go to stderr.
// stdout is reserved for MCP JSON-RPC messages. Writing logs to stdout
// will corrupt the MCP protocol stream.
//
// pino({ level, transport: { target: 'pino/file', options: { destination: 2 } } })
// destination: 2 = stderr file descriptor
```

---

### src/utils/crypto.ts

```typescript
// AES-256-GCM encryption helpers using Node.js crypto module.
//
// encrypt(plaintext: string, key: string): EncryptedData
//   1. Derive 32-byte key: crypto.createHash('sha256').update(key).digest()
//   2. Generate IV: crypto.randomBytes(16)
//   3. Create cipher: crypto.createCipheriv('aes-256-gcm', derivedKey, iv)
//   4. Encrypt: cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex')
//   5. Get auth tag: cipher.getAuthTag().toString('hex')
//   6. Return { iv: iv.toString('hex'), tag, data: encrypted }
//
// decrypt(encrypted: EncryptedData, key: string): string
//   1. Derive key same way
//   2. Create decipher: crypto.createDecipheriv('aes-256-gcm', derivedKey, Buffer.from(encrypted.iv, 'hex'))
//   3. Set auth tag: decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'))
//   4. Decrypt: decipher.update(encrypted.data, 'hex', 'utf8') + decipher.final('utf8')
//   5. Return decrypted string
//
// type EncryptedData = { iv: string; tag: string; data: string }
```

---

## TESTING STRATEGY

### Test structure

```typescript
// Use vitest. Each test file mirrors source structure.
// MSW (Mock Service Worker) intercepts ALL HTTP requests to LinkedIn API.
// No mocking of axios or internal modules — test through the real code path.

// tests/setup.ts:
//   - Configure MSW server with default handlers
//   - Default handlers return success for common endpoints
//   - Tests override handlers for error scenarios

// Test pattern:
describe("createPost", () => {
  it("creates a post with valid text", async () => { /* happy path */ });
  it("rejects text exceeding 3000 chars", async () => { /* validation */ });
  it("appends hashtags correctly", async () => { /* formatting */ });
  it("handles 429 rate limit response", async () => { /* error handling */ });
  it("auto-refreshes expired token", async () => { /* auth flow */ });
});
```

### MSW handler patterns

```typescript
// Default success handlers:
http.get("https://api.linkedin.com/v2/userinfo", () => {
  return HttpResponse.json({ sub: "test123", name: "Test User", given_name: "Test", family_name: "User" });
});

http.post("https://api.linkedin.com/rest/posts", () => {
  return new HttpResponse(null, {
    status: 201,
    headers: { "x-restli-id": "urn:li:share:7654321" },
  });
});

// Error scenario overrides in individual tests:
server.use(
  http.post("https://api.linkedin.com/rest/posts", () => {
    return HttpResponse.json({ message: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  })
);
```

### What to test

- **Auth**: Full OAuth flow, token storage/retrieval, token refresh, expired token handling
- **API Client**: Post creation, image upload, profile fetch, error responses (401, 403, 429, 500)
- **Content Formatter**: Text truncation, hashtag formatting, markdown stripping, edge cases (empty text, max length, unicode)
- **Rate Limiter**: Window sliding, limit enforcement, retry-after calculation
- **Scheduler**: Post scheduling, polling, retry logic, cancellation, past-date rejection
- **Crypto**: Encryption/decryption roundtrip, wrong key rejection, corrupt data handling

---

## BUILD & RUN

### Makefile targets

```makefile
.PHONY: install build dev test lint typecheck clean docker-build docker-run

install:
	npm install

build:
	npx tsc

dev:
	npx tsx src/index.ts

dev-sse:
	MCP_TRANSPORT=sse npx tsx src/index.ts

test:
	npx vitest run

test-watch:
	npx vitest

lint:
	npx eslint src/

typecheck:
	npx tsc --noEmit

clean:
	rm -rf dist/ node_modules/

docker-build:
	docker build -t linkedin-mcp-server .

docker-run:
	docker run --env-file .env -p 3001:3001 linkedin-mcp-server

# Pre-commit check — run before any commit
check: typecheck lint test
	@echo "✅ All checks passed"
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### package.json scripts

```json
{
  "name": "linkedin-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": { "linkedin-mcp": "dist/index.js" },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "prepare": "npm run build"
  }
}
```

### Dockerfile

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data
VOLUME ["/app/data"]
ENV NODE_ENV=production
ENV MCP_TRANSPORT=sse
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Claude Desktop config

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/absolute/path/to/linkedin-mcp-server/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "your_client_id",
        "LINKEDIN_CLIENT_SECRET": "your_client_secret",
        "TOKEN_ENCRYPTION_KEY": "your_32_char_encryption_key_here!",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

---

## .env.example

```bash
# LinkedIn OAuth 2.0 (REQUIRED)
# Get these from https://www.linkedin.com/developers/apps
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:3456/callback

# Token Storage
TOKEN_STORE_TYPE=file
TOKEN_STORE_PATH=./data/tokens.enc
TOKEN_ENCRYPTION_KEY=CHANGE_ME_32_CHARS_MINIMUM!!!!!!

# For CI/CD: set TOKEN_STORE_TYPE=env and provide tokens directly
# LINKEDIN_ACCESS_TOKEN=
# LINKEDIN_REFRESH_TOKEN=

# Server Transport
MCP_TRANSPORT=stdio
SSE_PORT=3001
LOG_LEVEL=info

# Scheduler
SCHEDULER_ENABLED=true
SCHEDULER_DB_PATH=./data/scheduler.db

# Rate Limits (LinkedIn defaults)
RATE_LIMIT_POSTS_PER_DAY=100
RATE_LIMIT_API_PER_MINUTE=150
```

---

## IMPLEMENTATION ORDER

**Claude Code: follow this exact sequence. Complete each phase before starting the next. Run `make check` after each phase.**

### Phase 1: Scaffold + Config + Models (Estimated: 30 min)

1. Initialize project: `npm init`, install all dependencies, create tsconfig.json
2. Create directory structure (all folders under src/)
3. Implement `src/config/env.ts` — zod schema for env vars
4. Implement `src/config/linkedin-api.ts` — API constants
5. Implement `src/models/schemas.ts` — all zod schemas
6. Implement `src/models/errors.ts` — error hierarchy
7. Implement `src/models/types.ts` — type re-exports
8. Implement `src/utils/logger.ts` — pino factory (stderr for stdio)
9. Implement `src/utils/crypto.ts` — AES-256-GCM helpers
10. Implement `src/utils/id.ts` — crypto.randomUUID wrapper

**Acceptance criteria:** `npx tsc --noEmit` passes. All schemas can be imported.

### Phase 2: Auth System (Estimated: 45 min)

1. Implement `src/auth/token-store.ts` — TokenStore interface
2. Implement `src/auth/file-token-store.ts` — encrypted file storage
3. Implement `src/auth/env-token-store.ts` — env var storage (read-only)
4. Implement `src/auth/callback-server.ts` — temporary HTTP server
5. Implement `src/auth/auth-manager.ts` — full OAuth 2.0 flow
6. Write tests for file-token-store (encrypt/decrypt roundtrip, wrong key, missing file)
7. Write tests for auth-manager (mock LinkedIn token endpoint with MSW)

**Acceptance criteria:** Can encrypt/decrypt tokens. Auth URL generation works. Token exchange works with mocked LinkedIn.

### Phase 3: API Client + Rate Limiter (Estimated: 45 min)

1. Implement `src/api/retry.ts` — axios retry interceptor
2. Implement `src/api/rate-limiter.ts` — sliding window
3. Implement `src/api/linkedin-client.ts` — all API methods
4. Write tests for rate-limiter (window sliding, limit enforcement)
5. Write tests for linkedin-client (post creation, profile fetch, error handling)

**Acceptance criteria:** All API methods work with MSW mocks. Rate limiter correctly throttles. Retry interceptor backs off on 429/5xx.

### Phase 4: Services (Estimated: 30 min)

1. Implement `src/services/content-formatter.ts`
2. Implement `src/services/media-handler.ts`
3. Implement `src/services/post-scheduler.ts` (including SQLite schema creation)
4. Write tests for content-formatter (formatting, validation, edge cases)
5. Write tests for post-scheduler (schedule, poll, retry, cancel)

**Acceptance criteria:** Content formatting handles all edge cases. Scheduler creates DB, inserts, polls, and updates correctly.

### Phase 5: Tools + Server (Estimated: 45 min)

1. Implement all 7 tool files in `src/tools/`
2. Implement `src/tools/index.ts` — exports all tools
3. Implement `src/server.ts` — LinkedInMCPServer facade
4. Implement `src/index.ts` — entry point with DI and transport setup
5. Write integration tests for each tool (validate input, mock API, check output format)

**Acceptance criteria:** `npx tsx src/index.ts` starts without errors. `make check` passes all checks.

### Phase 6: Docker + Docs (Estimated: 15 min)

1. Create Dockerfile (multi-stage build)
2. Create docker-compose.yml
3. Create Makefile with all targets
4. Create .env.example
5. Create .gitignore (data/, node_modules/, dist/, .env)
6. Create README.md with setup instructions
7. Create `scripts/setup-linkedin-app.md` — LinkedIn developer app setup guide

**Acceptance criteria:** `docker build` succeeds. `docker run` starts the server. README has clear setup instructions.

---

## LINKEDIN DEVELOPER APP SETUP (for reference)

Claude Code: include this in `scripts/setup-linkedin-app.md`:

1. Go to https://www.linkedin.com/developers/apps
2. Click "Create app"
3. Fill in: App name, LinkedIn Page (create one if needed), Logo
4. After creation, go to "Auth" tab
5. Add redirect URL: `http://localhost:3456/callback`
6. Go to "Products" tab → Request access to:
   - "Share on LinkedIn" (grants `w_member_social`)
   - "Sign In with LinkedIn using OpenID Connect" (grants `openid`, `profile`)
7. Wait for approval (usually instant for Share on LinkedIn)
8. Copy Client ID and Client Secret from "Auth" tab
9. Set them as LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET

**IMPORTANT:** The "Share on LinkedIn" product is required for posting. Without it, the `w_member_social` scope won't be available and posts will fail with 403.

---

## COMMON PITFALLS — AVOID THESE

1. **stdout vs stderr**: In stdio mode, ALL logs and debug output MUST go to stderr. stdout is exclusively for MCP JSON-RPC. If you write anything else to stdout, the MCP client will crash.

2. **Content-Type for OAuth**: Token exchange uses `application/x-www-form-urlencoded`, NOT JSON. This is the #1 cause of "invalid_request" errors.

3. **LinkedIn API versioning**: The `LinkedIn-Version: 202401` header is REQUIRED on all `/rest/` endpoints. Missing it returns 400.

4. **Post URN location**: On successful post creation (201), the URN is in the `x-restli-id` response HEADER, not the body. The body may be empty.

5. **Image upload is two-step**: You must first initialize the upload (get URL + URN), then PUT the binary. You cannot upload in a single request.

6. **Member URN format**: It's `urn:li:person:{sub}` where `sub` comes from the `/v2/userinfo` endpoint. The old `/v2/me` endpoint with `id` field is deprecated.

7. **Zod schemas for MCP SDK**: The `@modelcontextprotocol/sdk` `server.tool()` method accepts raw zod schemas (not JSON Schema). Pass the zod object directly.

8. **File permissions**: Token file must be 0o600. The data directory must be 0o700. Set these explicitly after creation.

9. **Graceful shutdown**: The scheduler's cron job and callback server must be stopped on SIGINT/SIGTERM. Register shutdown handlers in index.ts.

10. **ESM imports**: With `"type": "module"` in package.json, all relative imports need `.js` extension: `import { x } from "./auth/auth-manager.js"` (even though the source is .ts).

---

## QUALITY CHECKLIST — RUN BEFORE EVERY COMMIT

- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `npx vitest run` — all tests pass
- [ ] `npx eslint src/` — zero lint errors
- [ ] No hardcoded credentials or tokens anywhere
- [ ] All logs go to stderr in stdio mode
- [ ] All LinkedIn API constants come from linkedin-api.ts
- [ ] All user inputs validated with zod schemas
- [ ] All LinkedIn API responses validated with zod schemas
- [ ] Error messages are actionable (tell user what to do next)
- [ ] Tool outputs use emoji prefixes (✅ success, ❌ error, 🔗 link, 📝 details)
- [ ] No file exceeds 250 lines

---

## CONVERSATION CONTINUITY

When resuming work on this project, Claude Code should:
1. Re-read this CLAUDE.md first
2. Check `git status` and `git log --oneline -10` for current state
3. Run `make check` to see what's passing/failing
4. Continue from the next incomplete phase
5. Never re-implement something that's already working — check first

---

## CLAUDE DESKTOP USAGE GUIDE

This section is for users who have completed setup and want to use the LinkedIn MCP tools through Claude Desktop.

### First Time: Authenticate

Open a chat in Claude Desktop and say:

> "Authenticate with LinkedIn"

A browser window opens. Sign in, authorize, done. You only do this once -- tokens are encrypted on disk and auto-refresh for ~1 year.

### Available Commands (Natural Language)

You don't need to memorize tool names. Just ask Claude naturally. Here are all the things you can do:

#### Create Posts

```
"Post on LinkedIn: Just shipped our new API. Feedback welcome!"
```
```
"Create a LinkedIn post about my experience at the tech conference, add hashtags tech, ai, conference"
```
```
"Post to connections only: We're hiring a senior engineer. DM me if interested."
```

- Max 3000 characters
- Hashtags are appended automatically (no need for # symbol)
- Visibility: PUBLIC (default) or CONNECTIONS

#### Share Articles

```
"Share my article 'Building MCP Servers' from https://myblog.com/mcp-servers on LinkedIn"
```
```
"Publish an article with title 'AI in 2026' from https://example.com/ai-2026 with cover image ~/Desktop/cover.png"
```

- Requires a source URL (LinkedIn API limitation)
- Optional cover image (jpg, png, gif, max 8MB)

#### Upload Images

```
"Upload ~/Desktop/diagram.png to LinkedIn"
```

- Returns an image URN that can be referenced in posts
- Supports: jpg, png, gif (max 8MB)

#### View Profile

```
"Show my LinkedIn profile"
```

- Returns your name, LinkedIn URN, and profile picture

#### Schedule Posts

```
"Schedule a LinkedIn post for tomorrow at 9am: Big announcement coming soon!"
```
```
"Schedule a post for 2026-04-10T14:00:00Z about our product launch with hashtags launch, startup"
```

- Must be at least 5 minutes in the future
- Server checks every minute and publishes when the time arrives
- Retries up to 3 times on failure

#### List Scheduled Posts

```
"Show my scheduled LinkedIn posts"
```
```
"List failed scheduled posts"
```

- Filter by status: PENDING, PUBLISHED, FAILED

### Automation Workflows

Once authenticated, you can chain these tools into powerful workflows:

#### Weekly Content Calendar
Tell Claude:
> "Help me plan my LinkedIn content for this week. I want to post about: (1) a project update on Monday, (2) an industry insight on Wednesday, (3) a personal reflection on Friday. Draft all three posts and schedule them for 10am EST on each day."

#### Blog Repurposing Pipeline
> "Read this blog post at [URL], pull out the 3 key takeaways, and create a concise LinkedIn post with relevant hashtags. Then schedule it for tomorrow morning."

#### Engagement-Optimized Posting
> "Here's my draft post: [paste text]. Rewrite it for maximum LinkedIn engagement -- add a hook in the first line, use short paragraphs, end with a question, and suggest 5 relevant hashtags. Then post it."

#### Batch Content Creation
> "I have a list of 5 topics I want to post about this week: [list topics]. Draft a post for each one, show them to me for approval, then schedule them for one per weekday at 9am."

#### Image + Post Combo
> "Upload ~/Desktop/infographic.png to LinkedIn, then create a post about our Q1 results referencing that image."

### Tips

- **You can edit before posting.** Ask Claude to draft first, review, then say "post it."
- **Scheduling uses your server's clock.** Make sure your machine's timezone is correct.
- **Rate limits are enforced.** Max 100 posts/day, 150 API calls/minute. You won't hit these in normal use.
- **Tokens auto-refresh.** If you get an auth error after months, just say "Authenticate with LinkedIn" again.
- **All posts go to your personal profile.** Company page posting is not supported in this version.

---

*Last updated: April 2026. This file is the contract between Gurpreet and Claude Code.*
