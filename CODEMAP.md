# CODEMAP — AmplifyrMCP

> Quick-reference map of the entire codebase. Read this instead of scanning files.
> Last updated: 2026-04-12

---

## Project Overview

- **Name:** amplifyr-mcp v1.0.0
- **Stack:** Node.js 20+ / TypeScript 5.4+ / ESM (`"type": "module"`)
- **Purpose:** MCP server connecting Claude Desktop to LinkedIn, Medium, and Telegram
- **Transport:** stdio (primary) + SSE HTTP (secondary)
- **Total source:** ~3600 lines across 44 files
- **Tests:** 41 passing (5 test files, ~710 lines)
- **Dual-app architecture:** Primary app (posting) + Community Management API app (engagement)
- **Build:** `tsc` compiles clean (`npx tsc --noEmit` = 0 errors)

---

## Source Tree (`src/`)

### Entry & Server

| File | Lines | Purpose |
|------|-------|---------|
| `index.ts` | 168 | Entry point — CLI args, DI wiring (primary + community app), transport, graceful shutdown |
| `server.ts` | 370 | `LinkedInMCPServer` — registers up to 20 tools (15 always + 5 when community app configured) |

### Config (`src/config/`)

| File | Lines | Purpose |
|------|-------|---------|
| `env.ts` | 57 | Zod schema validating all env vars at startup (primary app + optional community app + Telegram + Medium) |
| `linkedin-api.ts` | 52 | All LinkedIn API constants: URLs, version (`202601`), endpoints, headers, limits, primary + community scopes |

### Auth (`src/auth/`)

| File | Lines | Purpose |
|------|-------|---------|
| `token-store.ts` | 7 | `TokenStore` interface (load/save/delete) |
| `file-token-store.ts` | 65 | AES-256-GCM encrypted file storage (`data/tokens.enc`) |
| `env-token-store.ts` | 33 | Read-only token store from env vars (for CI/CD) |
| `auth-manager.ts` | 153 | Full OAuth 2.0 flow: auth URL, code exchange, token refresh. Accepts custom scopes + callback port for dual-app support. |
| `callback-server.ts` | 91 | Temporary HTTP server for OAuth callback (port 3456 primary, 3457 community) |

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
| `getPostStats(postUrn)` | GET /rest/socialActions/{urn} | Likes, comments, shares (impressions/clicks require Marketing API) |
| `getComments(postUrn, count)` | GET /rest/socialActions/{urn}/comments | Read comments on a post |
| `replyToComment(postUrn, commentUrn, text)` | POST /rest/socialActions/{urn}/comments | Reply to a comment |
| `deletePost(postUrn)` | DELETE /rest/posts/{urn} | Delete a post |
| `editPost(postUrn, text)` | PATCH /rest/posts/{urn} | Update post text |
| `likePost(postUrn)` | POST /rest/socialActions/{urn}/likes | Like a post |
| `getProfileStats()` | GET /rest/networkSizes/{urn} | Follower count |
| `searchPosts(query, count)` | GET /rest/posts?q=author | Search own posts by keyword |

### Tools (`src/tools/`) — up to 20 MCP tools (15 always + 5 when community app configured)

#### LinkedIn — Content Creation (4 tools)

| File | Lines | Tool Name | Tested |
|------|-------|-----------|--------|
| `authenticate.tool.ts` | 53 | `linkedin_authenticate` | — |
| `create-post.tool.ts` | 67 | `linkedin_create_post` | — |
| `create-post-with-image.tool.ts` | 59 | `linkedin_create_post_with_image` | YES |
| `publish-article.tool.ts` | 80 | `linkedin_publish_article` | — |

#### LinkedIn — Post Management (3 tools)

| File | Lines | Tool Name | Tested |
|------|-------|-----------|--------|
| `edit-post.tool.ts` | 27 | `linkedin_edit_post` | YES |
| `delete-post.tool.ts` | 26 | `linkedin_delete_post` | YES |
| `upload-media.tool.ts` | 39 | `linkedin_upload_media` | — |

#### LinkedIn — Engagement (5 tools, requires Community Management API app)

These tools only appear when `LINKEDIN_COMMUNITY_CLIENT_ID` is configured.

| File | Lines | Tool Name | Tested |
|------|-------|-----------|--------|
| `authenticate-community.tool.ts` | 55 | `linkedin_authenticate_community` | — |
| `like-post.tool.ts` | 26 | `linkedin_like_post` | YES |
| `get-comments.tool.ts` | 38 | `linkedin_get_comments` | YES |
| `reply-to-comment.tool.ts` | 33 | `linkedin_reply_to_comment` | YES |
| `get-post-stats.tool.ts` | 37 | `linkedin_get_post_stats` | YES |

#### LinkedIn — Analytics (3 tools)

| File | Lines | Tool Name | Tested |
|------|-------|-----------|--------|
| `get-profile.tool.ts` | 31 | `linkedin_get_profile` | — |
| `get-profile-stats.tool.ts` | 37 | `linkedin_get_profile_stats` | YES |
| `search-posts.tool.ts` | 42 | `linkedin_search_posts` | YES (2 tests) |

#### LinkedIn — Scheduling (3 tools)

| File | Lines | Tool Name | Tested |
|------|-------|-----------|--------|
| `schedule-post.tool.ts` | 64 | `linkedin_schedule_post` | — |
| `list-scheduled.tool.ts` | 44 | `linkedin_list_scheduled` | — |
| `cancel-scheduled.tool.ts` | 26 | `linkedin_cancel_scheduled` | — |

#### Medium (2 tools)

| File | Lines | Tool Name | Tested |
|------|-------|-----------|--------|
| `medium-publish.tool.ts` | 67 | `medium_publish_article` | — |
| `medium-profile.tool.ts` | 28 | `medium_get_profile` | — |

| `index.ts` | 20 | Re-exports all 20 tool schemas + handlers | — |

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
| `setup.ts` | 112 | — | MSW server setup with handlers for all LinkedIn API endpoints |
| `api/rate-limiter.test.ts` | 44 | 5 | Window sliding, limit enforcement, retry-after |
| `auth/file-token-store.test.ts` | 68 | 5 | Encrypt/decrypt roundtrip, wrong key, missing file |
| `services/content-formatter.test.ts` | 99 | 15 | Formatting, validation, hashtags, edge cases |
| `services/post-scheduler.test.ts` | 107 | 6 | Schedule, poll, retry, cancel, past-date rejection |
| `tools/new-tools.test.ts` | 167 | 10 | All 9 new tools: stats, comments, reply, delete, edit, like, profile stats, search (2), post with image |

**Total: 41 tests, all passing, zero real API calls (MSW mocked)**

### Test coverage gaps

| Area | Priority |
|------|----------|
| `linkedin-client.ts` error handling (401/403/429/500) | HIGH |
| `auth-manager.ts` OAuth flow | MEDIUM |
| Original tools (authenticate, create_post, publish_article, upload_media, get_profile) | MEDIUM |
| Scheduling tools (schedule, list, cancel) | LOW (service layer already tested) |

---

## Dual-App Architecture

LinkedIn requires the "Community Management API" to be the **only** product on an app. So engagement tools need a separate app.

### App 1 — Primary (port 3456)
Products: "Share on LinkedIn" + "Sign In with LinkedIn using OpenID Connect"
Scopes: `openid`, `profile`, `w_member_social`
Tools: 15 (posting, scheduling, editing, deleting, searching, Medium, profile)

### App 2 — Community (port 3457, optional)
Product: "Community Management API" only
Scopes: `r_member_social`, `w_member_social`
Tools: 5 (get_comments, get_post_stats, reply_to_comment, like_post, authenticate_community)

When `LINKEDIN_COMMUNITY_CLIENT_ID` is not set, the 5 engagement tools are not registered. Everything else works.

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
11. **MSW for testing** — all HTTP intercepted at network level, no axios mocking, zero real API calls
12. **Dual LinkedIn apps** — LinkedIn forces "Community Management API" to be sole product on an app, so engagement tools use a separate app with its own OAuth flow, token store, and callback port
