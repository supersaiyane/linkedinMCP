---
title: Contributing
sidebar_label: Contributing
sidebar_position: 14
audience: L2-L3
---

# Contributing

How to set up a development environment, understand the codebase, write tests, add new tools, and submit pull requests.

**TL;DR:** Fork the repo, run `npm install`, copy `.env.example` to `.env`, and fill in your LinkedIn credentials. Use `make check` before every commit. Follow the one-file-one-responsibility pattern and validate everything with Zod.

**Prerequisite knowledge:** Node.js and TypeScript development. Familiarity with npm, Git branching, and writing unit tests. Reading the [Architecture](Architecture) page first helps with orientation.

---

## Development Setup

1. **Fork and clone the repository.**

    ```bash
    git clone https://github.com/<YOUR_GITHUB_USERNAME>/AmplifyrMCP.git
    cd AmplifyrMCP
    ```

2. **Install dependencies.**

    ```bash
    npm install
    ```

    Expected output ends with:

    ```text
    added 312 packages in 8s
    ```

3. **Copy the environment template.**

    ```bash
    cp .env.example .env
    ```

4. **Fill in your LinkedIn app credentials in `.env`.** You need `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` at minimum. See [LinkedIn-App-Setup](LinkedIn-App-Setup) for how to obtain them.

5. **Verify the setup.**

    ```bash
    make check
    ```

    Expected output:

    ```text
    npx tsc --noEmit
    npx vitest run
    ...
    Tests: X passed
    All checks passed
    ```

---

## Development Commands

All available commands in one table:

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the server with tsx (TypeScript execution, no build step) |
| `npm run build` | Compile TypeScript to JavaScript in `dist/` |
| `npm start` | Run the compiled server from `dist/index.js` |
| `npm run typecheck` | Run `tsc --noEmit` to check types without emitting files |
| `npm test` | Run all tests once with Vitest |
| `npm run test:watch` | Run tests in watch mode (re-runs on file changes) |
| `npm run lint` | Run ESLint across `src/` |
| `make check` | Run typecheck + lint + tests (pre-commit gate) |
| `make dev` | Alias for `npm run dev` |
| `make dev-sse` | Start the server in SSE transport mode |
| `make clean` | Delete `dist/` and `node_modules/` |
| `make docker-build` | Build the Docker image |
| `make docker-run` | Run the Docker container with `.env` |

---

## Project Structure

```text
src/
  index.ts                    Entry point: loads config, wires dependencies, starts server
  server.ts                   MCP server facade: registers all tools with the SDK
  config/
    env.ts                    Zod schema for all environment variables; fails fast on invalid config
    linkedin-api.ts           All LinkedIn API URLs, headers, version strings, and limits
  auth/
    auth-manager.ts           OAuth 2.0 lifecycle: auth URL, token exchange, refresh
    callback-server.ts        Temporary HTTP server on port 3456 for OAuth redirect
    token-store.ts            TokenStore interface (load, save, delete)
    file-token-store.ts       AES-256-GCM encrypted file-based token persistence
    env-token-store.ts        Read-only token store from environment variables (CI/CD)
  api/
    linkedin-client.ts        Low-level HTTP client for LinkedIn REST API v2
    rate-limiter.ts           Sliding window rate limiter (in-memory)
    retry.ts                  Axios response interceptor for 429/5xx retry with backoff
  tools/                        20 tool handlers (one file each)
    index.ts                  Re-exports all tool schemas and handlers
    authenticate.tool.ts      linkedin_authenticate: OAuth flow (primary app, port 3456)
    authenticate-community.tool.ts  linkedin_authenticate_community: OAuth flow (community app, port 3457)
    create-post.tool.ts       linkedin_create_post: text posts with hashtags
    create-post-with-image.tool.ts  linkedin_create_post_with_image: image + post in one step
    publish-article.tool.ts   linkedin_publish_article: article sharing with source URL
    edit-post.tool.ts         linkedin_edit_post: update post text
    delete-post.tool.ts       linkedin_delete_post: remove a post
    upload-media.tool.ts      linkedin_upload_media: image upload (two-step flow)
    like-post.tool.ts         linkedin_like_post: like a post
    get-comments.tool.ts      linkedin_get_comments: read post comments
    reply-to-comment.tool.ts  linkedin_reply_to_comment: reply to a comment
    get-profile.tool.ts       linkedin_get_profile: fetch profile data
    get-profile-stats.tool.ts linkedin_get_profile_stats: follower count
    get-post-stats.tool.ts    linkedin_get_post_stats: likes, comments, shares
    search-posts.tool.ts      linkedin_search_posts: search own posts by keyword
    schedule-post.tool.ts     linkedin_schedule_post: queue a post for future publish
    list-scheduled.tool.ts    linkedin_list_scheduled: query the scheduler database
    cancel-scheduled.tool.ts  linkedin_cancel_scheduled: cancel pending post
    medium-publish.tool.ts    medium_publish_article: publish to Medium
    medium-profile.tool.ts    medium_get_profile: fetch Medium profile
  services/
    content-formatter.ts      Text processing: hashtag appending, markdown stripping, validation
    media-handler.ts          File reading, MIME detection, size validation for uploads
    post-scheduler.ts         SQLite-backed scheduling queue with cron polling
  models/
    schemas.ts                Zod schemas for all data types (tokens, posts, profiles, API responses)
    errors.ts                 Error class hierarchy extending LinkedInMCPError
    types.ts                  TypeScript type exports inferred from Zod schemas
  utils/
    logger.ts                 Pino logger factory (stderr in stdio mode)
    crypto.ts                 AES-256-GCM encrypt/decrypt helpers
    id.ts                     UUID generation wrapper

tests/
  setup.ts                    MSW server configuration and shared test fixtures
  auth/                       Tests for auth-manager and file-token-store
  api/                        Tests for linkedin-client and rate-limiter
  tools/                      Tests for tool handlers (10 tests covering all new tools)
  services/                   Tests for content-formatter and post-scheduler
  fixtures/                   Static test data (tokens.json, profile-response.json, post-response.json)
```

---

## Code Guidelines

### File size: 250 lines maximum

If a file approaches 250 lines, split it. Extract helper functions into a utility module or break a large class into smaller focused classes.

### One file, one responsibility

Each file handles a single concern. Tool handlers do not contain formatting logic. Services do not make HTTP calls directly. The API client does not validate business rules.

### Zod everywhere

- All tool inputs are validated with Zod schemas before any processing.
- All LinkedIn API responses are validated with Zod schemas after deserialization.
- All environment variables are validated with Zod at startup.
- If a value crosses a trust boundary (user input, external API, file system), validate it with Zod.

### Error handling

- Every custom error extends `LinkedInMCPError` (defined in `src/models/errors.ts`).
- Error messages must be actionable. "Authentication failed" is insufficient. "Authentication failed: refresh token expired. Run linkedin_authenticate to re-authorize." is actionable.
- Tool handlers catch all errors and return `{ isError: true, content: [{ type: "text", text: "..." }] }`. They never throw unhandled exceptions.

### No hardcoded values

- API URLs, version strings, and headers live in `src/config/linkedin-api.ts`.
- Environment-dependent values live in `src/config/env.ts`.
- No magic strings or numbers in tool handlers or services. Use named constants.

### Logs to stderr

When the server uses stdio transport, stdout is reserved for MCP JSON-RPC messages. All Pino log output goes to stderr (file descriptor 2). Writing anything to stdout corrupts the MCP protocol stream.

### Immutability

Prefer creating new objects over mutating existing ones. Tool handlers receive `args` and `deps` and return a result object. They do not modify their inputs.

---

## Testing with Vitest and MSW

### Test runner: Vitest

Tests live in the `tests/` directory and mirror the `src/` structure. Run them with:

```bash
npm test              # Single run
npm run test:watch    # Watch mode, re-runs on save
```

### HTTP mocking: MSW (Mock Service Worker)

MSW intercepts HTTP requests at the network level. The test setup file (`tests/setup.ts`) configures a set of default success handlers for common LinkedIn API endpoints.

Do not mock axios or internal modules. Test through the real code path with MSW intercepting the outbound HTTP.

### Default MSW handlers

```typescript
// tests/setup.ts provides these default handlers:

// GET /v2/userinfo -> returns test profile
http.get("https://api.linkedin.com/v2/userinfo", () => {
  return HttpResponse.json({
    sub: "test123",
    name: "Test User",
    given_name: "Test",
    family_name: "User",
  });
});

// POST /rest/posts -> returns 201 with post URN in header
http.post("https://api.linkedin.com/rest/posts", () => {
  return new HttpResponse(null, {
    status: 201,
    headers: { "x-restli-id": "urn:li:share:7654321" },
  });
});
```

### Overriding handlers for error scenarios

In individual test files, override a handler to simulate errors:

```typescript
import { server } from "../setup.js";
import { http, HttpResponse } from "msw";

it("handles 429 rate limit response", async () => {
  server.use(
    http.post("https://api.linkedin.com/rest/posts", () => {
      return HttpResponse.json(
        { message: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    })
  );

  // ... test that the handler returns an appropriate error
});
```

### Test pattern

Every test file follows this structure:

```typescript
describe("featureName", () => {
  it("does the expected thing on valid input", async () => {
    // happy path
  });

  it("rejects invalid input with a clear error", async () => {
    // validation failure
  });

  it("handles API errors gracefully", async () => {
    // MSW override returning 4xx or 5xx
  });
});
```

### What to test

| Area | What to cover |
|------|---------------|
| Auth | OAuth flow, token storage roundtrip, token refresh, expired token handling |
| API Client | Post creation, image upload, profile fetch, error responses (401, 403, 429, 500) |
| Content Formatter | Hashtag formatting, markdown stripping, text truncation, unicode, empty input |
| Rate Limiter | Window sliding, limit enforcement, retry-after calculation |
| Scheduler | Scheduling, polling, retry on failure, cancellation, past-date rejection |
| Crypto | Encryption/decryption roundtrip, wrong key detection, corrupt data handling |

---

## How to Add a New Tool

Adding a new MCP tool requires five steps:

### Step 1: Create the tool file

Create `src/tools/<your-tool>.tool.ts` following the established pattern:

```typescript
import { z } from "zod";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";
import type { Logger } from "pino";

// 1. Define the input schema
export const yourToolSchema = {
  paramName: z.string().min(1).describe("What this parameter does"),
};

// 2. Define the handler
export async function yourToolHandler(
  args: z.infer<z.ZodObject<typeof yourToolSchema>>,
  deps: { apiClient: LinkedInAPIClient; logger: Logger }
) {
  const { apiClient, logger } = deps;

  // ... implementation ...

  return {
    content: [{ type: "text" as const, text: "Result message" }],
  };
}
```

### Step 2: Export from the tools index

Add your tool to `src/tools/index.ts`:

```typescript
export { yourToolSchema, yourToolHandler } from "./your-tool.tool.js";
```

### Step 3: Register in the server

In `src/server.ts`, add a `server.tool()` call:

```typescript
server.tool(
  "linkedin_your_tool",
  "Description of what this tool does.",
  yourToolSchema,
  async (args) => yourToolHandler(args, deps)
);
```

### Step 4: Write tests

Create `tests/tools/your-tool.test.ts` with at least:

- A happy-path test with valid input.
- A validation test with invalid input.
- An API error test using an MSW handler override.

### Step 5: Update documentation

Add the tool to the [Tools-Reference](Tools-Reference) wiki page with its parameters, example prompts, and expected output.

---

## Pull Request Process

1. **Create a feature branch** from `main`:

    ```bash
    git checkout -b feat/your-feature-name
    ```

2. **Make your changes** following the code guidelines above.

3. **Run the pre-commit gate:**

    ```bash
    make check
    ```

    All three checks (typecheck, lint, test) must pass.

4. **Verify manually** that no file exceeds 250 lines, no `console.log` statements remain, and no hardcoded credentials exist.

5. **Write a clear PR description** with:
    - What changed and why.
    - How to test the change.
    - Any configuration changes required.

6. **Submit the PR** against `main`.

### PR acceptance criteria

- `make check` passes in CI.
- No CRITICAL or HIGH issues from code review.
- New functionality includes tests.
- No file exceeds 250 lines.
- Error messages are actionable.

---

## Reporting Issues

[Open an issue](https://github.com/supersaiyane/AmplifyrMCP/issues) with:

- What you expected to happen.
- What happened instead.
- Error messages (full text, not screenshots).
- Steps to reproduce.
- Node.js version (`node --version`) and operating system.

---

## Key Takeaways

- Run `make check` before every commit. It gates on typecheck, lint, and tests.
- Test with MSW at the network level. Do not mock internal modules.
- Every tool follows the same file structure: schema, handler, export, register, test.
- Files stay under 250 lines. Zod validates every trust boundary. Errors include next steps.
- Logs go to stderr when using stdio transport.

## Related Pages

- [Architecture](Architecture) -- Component diagram and dependency flow
- [Tools-Reference](Tools-Reference) -- Full parameter reference for all MCP tools
- [Configuration](Configuration) -- Environment variables and defaults
- [Docker-Deployment](Docker-Deployment) -- Running the server in a container
- [Troubleshooting](Troubleshooting) -- Common development and runtime issues
