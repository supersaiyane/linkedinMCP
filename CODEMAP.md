# CODEMAP — AmplifyrMCP

> Quick-reference map of the entire codebase. Read this instead of scanning files.
> Last updated: 2026-04-12

---

## Project Overview

- **Name:** amplifyr-mcp v1.0.0
- **Stack:** Node.js 20+ / TypeScript 5.4+ / ESM (`"type": "module"`)
- **Purpose:** MCP server connecting Claude Desktop to LinkedIn, Medium, and Telegram
- **Transport:** stdio (primary) + SSE HTTP (secondary)
- **Total source:** ~3400 lines across 43 files
- **Tests:** 31 passing (4 test files, ~418 lines)
- **Build:** `tsc` compiles clean (`npx tsc --noEmit` = 0 errors)

---

## Source Tree (`src/`)

### Entry & Server

| File | Lines | Purpose |
|------|-------|---------|
| `index.ts` | 142 | Entry point — CLI args, DI wiring, transport setup, graceful shutdown |
| `server.ts` | 356 | `LinkedInMCPServer` — registers 19 tools via `McpServer.tool()` |

### Config (`src/config/`)

| File | Lines | Purpose |
|------|-------|---------|
| `env.ts` | 51 | Zod schema validating all env vars at startup |
| `linkedin-api.ts` | 50 | All LinkedIn API constants: URLs, version (`202601`), endpoints, headers, limits, scopes |

### Auth (`src/auth/`)

| File | Lines | Purpose |
|------|-------|---------|
| `token-store.ts` | 7 | `TokenStore` interface (load/save/delete) |
| `file-token-store.ts` | 65 | AES-256-GCM encrypted file storage (`data/tokens.enc`) |
| `env-token-store.ts` | 33 | Read-only token store from env vars (for CI/CD) |
| `auth-manager.ts` | 152 | Full OAuth 2.0 flow: auth URL, code exchange, token refresh |
| `callback-server.ts` | 91 | Temporary HTTP server on port 3456 for OAuth callback |

### API Clients (`src/api/`)

| File | Lines | Purpose |
|------|-------|---------|
| `linkedin-client.ts` | 431 | LinkedIn REST API v2 client — all methods below |
| `medium-client.ts` | 78 | Medium API client — getUser, createPost |
| `rate-limiter.ts` | 48 | Sliding window rate limiter (posts/day + api/minute) |
| `retry.ts` | 83 | Axios interceptor — retry on 429/5xx with exponential backoff |

**LinkedInAPIClient methods:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getUserProfile()` | GET /v2/userinfo | Fetch authenticated user profile |
| `getMemberUrn()` | (cached) | Get urn:li:person:{sub} |
| `createPost(content)` | POST /rest/posts | Create text/media post |
| `createArticlePost(input)` | POST /rest/posts | Create article-style post |
| `initializeImageUpload()` | POST /rest/images?action=initializeUpload | Get upload URL + image URN |
| `uploadImageBinary(url, data, mime)` | PUT {uploadUrl} | Upload raw image binary |
| `getPostStats(postUrn)` | GET /rest/organizationalEntityShareStatistics | Impressions, likes, comments, shares, clicks |
| `getComments(postUrn, count)` | GET /rest/socialActions/{urn}/comments | Read comments on a post |
| `replyToComment(postUrn, commentUrn, text)` | POST /rest/socialActions/{urn}/comments | Reply to a comment |
| `deletePost(postUrn)` | DELETE /rest/posts/{urn} | Delete a post |
| `editPost(postUrn, text)` | PATCH /rest/posts/{urn} | Update post text |
| `likePost(postUrn)` | POST /rest/socialActions/{urn}/likes | Like a post |
| `getProfileStats()` | GET /rest/networkSizes/{urn} | Follower count |
| `searchPosts(query, count)` | GET /rest/posts?q=author | Search own posts by keyword |

### Tools (`src/tools/`) — 19 MCP tools registered

#### LinkedIn — Content Creation (4 tools)

| File | Lines | Tool Name | Status |
|------|-------|-----------|--------|
| `authenticate.tool.ts` | 53 | `linkedin_authenticate` | DONE |
| `create-post.tool.ts` | 67 | `linkedin_create_post` | DONE |
| `create-post-with-image.tool.ts` | 59 | `linkedin_create_post_with_image` | DONE |
| `publish-article.tool.ts` | 80 | `linkedin_publish_article` | DONE |

#### LinkedIn — Post Management (3 tools)

| File | Lines | Tool Name | Status |
|------|-------|-----------|--------|
| `edit-post.tool.ts` | 27 | `linkedin_edit_post` | DONE |
| `delete-post.tool.ts` | 26 | `linkedin_delete_post` | DONE |
| `upload-media.tool.ts` | 39 | `linkedin_upload_media` | DONE |

#### LinkedIn — Engagement (3 tools)

| File | Lines | Tool Name | Status |
|------|-------|-----------|--------|
| `like-post.tool.ts` | 26 | `linkedin_like_post` | DONE |
| `get-comments.tool.ts` | 38 | `linkedin_get_comments` | DONE |
| `reply-to-comment.tool.ts` | 33 | `linkedin_reply_to_comment` | DONE |

#### LinkedIn — Analytics (4 tools)

| File | Lines | Tool Name | Status |
|------|-------|-----------|--------|
| `get-profile.tool.ts` | 31 | `linkedin_get_profile` | DONE |
| `get-profile-stats.tool.ts` | 37 | `linkedin_get_profile_stats` | DONE |
| `get-post-stats.tool.ts` | 34 | `linkedin_get_post_stats` | DONE |
| `search-posts.tool.ts` | 42 | `linkedin_search_posts` | DONE |

#### LinkedIn — Scheduling (3 tools)

| File | Lines | Tool Name | Status |
|------|-------|-----------|--------|
| `schedule-post.tool.ts` | 64 | `linkedin_schedule_post` | DONE |
| `list-scheduled.tool.ts` | 44 | `linkedin_list_scheduled` | DONE |
| `cancel-scheduled.tool.ts` | 26 | `linkedin_cancel_scheduled` | DONE |

#### Medium (2 tools)

| File | Lines | Tool Name | Status |
|------|-------|-----------|--------|
| `medium-publish.tool.ts` | 67 | `medium_publish_article` | DONE |
| `medium-profile.tool.ts` | 28 | `medium_get_profile` | DONE |

| `index.ts` | 19 | — | Re-exports all 19 tool schemas + handlers |

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

## OAuth Scopes

| Scope | Purpose | Status |
|-------|---------|--------|
| `openid` | OpenID Connect auth | Active |
| `profile` | Read profile info | Active |
| `w_member_social` | Write posts, comments, likes | Active |
| `r_member_social` | Read comments, analytics | NEW |
| `r_liteprofile` | Read lite profile | NEW |
| `r_organization_social` | Read org social data | NEW |
| `w_organization_social` | Write org social data | NEW |

Note: Users must re-authenticate after scope changes to pick up new permissions.

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

| File needed | Priority |
|-------------|----------|
| `tests/api/linkedin-client.test.ts` | HIGH |
| `tests/auth/auth-manager.test.ts` | MEDIUM |
| `tests/tools/*.test.ts` | HIGH |

---

## Build & Config Files

| File | Status |
|------|--------|
| `package.json` | DONE |
| `tsconfig.json` | DONE |
| `vitest.config.ts` | DONE |
| `Dockerfile` | DONE |
| `docker-compose.yml` | DONE |
| `Makefile` | DONE |
| `.env.example` | DONE |
| `.gitignore` | DONE |
| `.eslintrc.cjs` | MISSING |
| `.prettierrc` | MISSING |

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
9. **Shared error handler** — `makeErrorResult()` in server.ts wraps all tool errors consistently
10. **Helper refactoring in API client** — `authHeaders()` and `handleApiError()` reduce duplication
