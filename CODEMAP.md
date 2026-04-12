# CODEMAP — AmplifyrMCP

> Quick-reference map of the entire codebase. Read this instead of scanning files.
> Last updated: 2026-04-12

---

## Project Overview

- **Name:** amplifyr-mcp v1.0.0
- **Stack:** Node.js 20+ / TypeScript 5.4+ / ESM (`"type": "module"`)
- **Purpose:** MCP server connecting Claude Desktop to LinkedIn, Medium, and Telegram
- **Transport:** stdio (primary) + SSE HTTP (secondary)
- **Total source:** ~2750 lines across 34 files
- **Tests:** 31 passing (4 test files, ~418 lines)
- **Build:** `tsc` compiles clean (`npx tsc --noEmit` = 0 errors)

---

## Source Tree (`src/`)

### Entry & Server

| File | Lines | Purpose |
|------|-------|---------|
| `index.ts` | 142 | Entry point — CLI args, DI wiring, transport setup, graceful shutdown |
| `server.ts` | 213 | `LinkedInMCPServer` — registers 10 tools via `McpServer.tool()` |

### Config (`src/config/`)

| File | Lines | Purpose |
|------|-------|---------|
| `env.ts` | 51 | Zod schema validating all env vars at startup (LinkedIn, tokens, scheduler, rate limits) |
| `linkedin-api.ts` | 38 | All LinkedIn API constants: URLs, version (`202603`), endpoints, headers, limits |

### Auth (`src/auth/`)

| File | Lines | Purpose |
|------|-------|---------|
| `token-store.ts` | 7 | `TokenStore` interface (load/save/delete) |
| `file-token-store.ts` | 65 | AES-256-GCM encrypted file storage (`data/tokens.enc`) |
| `env-token-store.ts` | 33 | Read-only token store from env vars (for CI/CD) |
| `auth-manager.ts` | 152 | Full OAuth 2.0 flow: auth URL, code exchange, token refresh |
| `callback-server.ts` | 91 | Temporary HTTP server on port 3456 for OAuth callback |

### API Clients (`src/api/`)

| File | Lines | Purpose | Methods |
|------|-------|---------|---------|
| `linkedin-client.ts` | 236 | LinkedIn REST API v2 client | getUserProfile, createPost, publishArticle, initializeImageUpload, uploadImageBinary |
| `medium-client.ts` | 78 | Medium API client | getUser, createPost |
| `rate-limiter.ts` | 48 | Sliding window rate limiter | checkLimit, recordRequest (posts/day + api/minute) |
| `retry.ts` | 83 | Axios interceptor | retry on 429/5xx with exponential backoff + jitter |

### Tools (`src/tools/`) — 10 MCP tools registered

| File | Lines | Tool Name | Description | Status |
|------|-------|-----------|-------------|--------|
| `authenticate.tool.ts` | 53 | `linkedin_authenticate` | OAuth flow, opens browser, stores tokens | DONE |
| `create-post.tool.ts` | 67 | `linkedin_create_post` | Text post with hashtags + visibility | DONE |
| `publish-article.tool.ts` | 80 | `linkedin_publish_article` | Article with source URL + optional cover image | DONE |
| `upload-media.tool.ts` | 39 | `linkedin_upload_media` | Image upload, returns URN | DONE |
| `get-profile.tool.ts` | 31 | `linkedin_get_profile` | Fetch authenticated user's profile | DONE |
| `schedule-post.tool.ts` | 64 | `linkedin_schedule_post` | Queue post for future publication | DONE |
| `list-scheduled.tool.ts` | 44 | `linkedin_list_scheduled` | List scheduled posts by status | DONE |
| `cancel-scheduled.tool.ts` | 27 | `linkedin_cancel_scheduled` | Cancel a pending scheduled post by ID | DONE |
| `medium-publish.tool.ts` | 67 | `medium_publish_article` | Publish article to Medium | DONE |
| `medium-profile.tool.ts` | 28 | `medium_get_profile` | Fetch Medium user profile | DONE |
| `index.ts` | 10 | — | Re-exports all tool schemas + handlers | — |

### Tools — PLANNED (not yet implemented)

| Tool Name | Description | Needs |
|-----------|-------------|-------|
| `linkedin_get_post_stats` | Get impressions, likes, comments, shares, clicks for a post | API method + tool |
| `linkedin_get_comments` | Read comments on a post | API method + tool |
| `linkedin_reply_to_comment` | Reply to a specific comment | API method + tool |
| `linkedin_delete_post` | Delete a published post | API method + tool |
| `linkedin_create_post_with_image` | Single tool: upload image + create post in one step | Tool (API methods exist) |
| `linkedin_get_profile_stats` | Get followers, profile views, search appearances | API method + tool |
| `linkedin_edit_post` | Edit/update an existing post | API method + tool |
| `linkedin_like_post` | Like a post | API method + tool |
| `linkedin_search_posts` | Search posts by keyword/hashtag | API method + tool |

### Services (`src/services/`)

| File | Lines | Purpose |
|------|-------|---------|
| `content-formatter.ts` | 89 | Text processing: formatPost, formatArticle, validatePost, validateArticle, extractHashtags |
| `media-handler.ts` | 59 | File reading, MIME detection, size validation for image uploads |
| `post-scheduler.ts` | 220 | SQLite queue + croner cron — schedule, poll, publish, retry (max 3), cancel |
| `telegram-notifier.ts` | 68 | Optional Telegram Bot API notifications on post publish/fail |

### Models (`src/models/`)

| File | Lines | Purpose |
|------|-------|---------|
| `schemas.ts` | 69 | Zod schemas: OAuthToken, PostContent, ArticleContent, UserProfile, PostResult, ScheduledPost, LinkedIn API responses |
| `errors.ts` | 89 | Error hierarchy: LinkedInMCPError base → AuthenticationError, RateLimitError, LinkedInAPIError, ContentValidationError, etc. |
| `types.ts` | 16 | Type re-exports inferred from zod schemas |

### Utils (`src/utils/`)

| File | Lines | Purpose |
|------|-------|---------|
| `logger.ts` | 16 | Pino logger factory (stderr in stdio mode) |
| `crypto.ts` | 35 | AES-256-GCM encrypt/decrypt helpers |
| `id.ts` | 5 | `crypto.randomUUID()` wrapper |

---

## Tests (`tests/`)

| File | Lines | Tests | What's covered |
|------|-------|-------|----------------|
| `setup.ts` | 50 | — | MSW server setup, test fixtures |
| `api/rate-limiter.test.ts` | 44 | 5 | Window sliding, limit enforcement, retry-after |
| `auth/file-token-store.test.ts` | 68 | 5 | Encrypt/decrypt roundtrip, wrong key, missing file |
| `services/content-formatter.test.ts` | 99 | 15 | Formatting, validation, hashtags, edge cases |
| `services/post-scheduler.test.ts` | 107 | 6 | Schedule, poll, retry, cancel, past-date rejection |

### Missing Tests

| File needed | Priority | What to test |
|-------------|----------|--------------|
| `tests/api/linkedin-client.test.ts` | HIGH | Post creation, profile fetch, image upload, error responses |
| `tests/auth/auth-manager.test.ts` | MEDIUM | Auth URL generation, code exchange, token refresh |
| `tests/tools/*.test.ts` | HIGH | Input validation, mock API, output format for each tool |

---

## OAuth Scopes

### Current

`openid`, `profile`, `w_member_social`

### Needed (for planned tools)

`r_liteprofile`, `r_organization_social`, `r_member_social`, `w_organization_social`

---

## Build & Config Files

| File | Status | Purpose |
|------|--------|---------|
| `package.json` | DONE | ESM project, scripts: build/dev/test/lint/typecheck |
| `tsconfig.json` | DONE | ES2022, NodeNext modules, strict mode |
| `vitest.config.ts` | DONE | Test runner config |
| `Dockerfile` | DONE | Multi-stage build (node:20-slim) |
| `docker-compose.yml` | DONE | Container orchestration with env file |
| `Makefile` | DONE | install, build, dev, test, lint, typecheck, docker-build, docker-run, check |
| `.env.example` | DONE | Template for all env vars |
| `.gitignore` | DONE | data/, node_modules/, dist/, .env |
| `.eslintrc.cjs` | MISSING | ESLint config — `npm run lint` will fail |
| `.prettierrc` | MISSING | Prettier formatting config |

---

## Wiki (`wiki/`) — 18 pages

Home, Getting-Started, Installation, Quick-Start-Guide, LinkedIn-App-Setup, Medium-Setup, Telegram-Setup, Configuration, Tools-Reference, Automation-Recipes, Architecture, Authentication, Concepts, Docker-Deployment, Troubleshooting, FAQ, Glossary, Contributing

---

## Key Architectural Decisions

1. **DI without framework** — all dependencies constructed in `index.ts` and passed through constructors
2. **Zod everywhere** — tool inputs, env vars, API responses all validated at runtime
3. **stdio logging to stderr** — stdout reserved for MCP JSON-RPC protocol
4. **SQLite for scheduler** — `better-sqlite3` sync API, zero external DB config
5. **Two-step image upload** — initialize (get URL+URN) then PUT binary
6. **Token encryption** — AES-256-GCM with key derived via SHA-256
7. **ESM imports** — all relative imports use `.js` extension
8. **One file, one tool** — each MCP tool is a separate `.tool.ts` file with exported schema + handler
