# AmplifyrMCP

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/Tests-41%20passing-brightgreen.svg)](#testing)

Amplify your content reach. An MCP server that connects Claude Desktop to **LinkedIn**, **Medium**, and **Telegram**. Manage your entire professional presence through natural language -- post, schedule, engage, analyze, and publish articles, all without leaving your AI assistant.

**Author:** Gurpreet Singh ([linkedin.com/in/gurpreettsengh](https://linkedin.com/in/gurpreettsengh))

---

## What is This?

AmplifyrMCP is a **bridge** between Claude (the AI assistant) and your social media accounts. Instead of opening LinkedIn, typing a post, clicking buttons -- you just tell Claude what you want in plain English and it handles the rest.

**How it works in practice:**

```
You:    "Post on LinkedIn: Just shipped v2.0 of our API. Feedback welcome!"
Claude: Uses linkedin_create_post tool → post appears on your LinkedIn feed

You:    "Show me the stats on my last post"
Claude: Uses linkedin_get_post_stats → Impressions: 1250, Likes: 42, Comments: 8

You:    "Reply to the first comment with 'Thanks for the feedback!'"
Claude: Uses linkedin_reply_to_comment → reply posted
```

Behind the scenes, AmplifyrMCP uses the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) -- a standard that lets AI assistants like Claude call external tools. Think of it as giving Claude "hands" to interact with LinkedIn on your behalf.

---

## All 19 Tools

### LinkedIn — Content Creation (4 tools)

#### 1. Authenticate (`linkedin_authenticate`)

**What it does:** Connects your LinkedIn account to Claude using OAuth 2.0 (the same secure login flow used by "Sign in with Google/LinkedIn" buttons).

**How it works:**
1. You say "Authenticate with LinkedIn"
2. Your browser opens LinkedIn's login page
3. You approve the connection
4. AmplifyrMCP stores your credentials locally, encrypted with AES-256-GCM (military-grade encryption)
5. Tokens auto-refresh for ~1 year, so you only do this once

**Why it's secure:** Your tokens are encrypted on disk at `data/tokens.enc`. Even if someone copies the file, they can't read it without your encryption key. Tokens are never logged, even in debug mode.

---

#### 2. Create Post (`linkedin_create_post`)

**What it does:** Publishes a text post to your LinkedIn personal feed.

**Features:**
- Up to 3,000 characters per post
- Optional hashtags (added automatically, no need to type `#`)
- Visibility control: `PUBLIC` (everyone) or `CONNECTIONS` (your network only)

**Example prompts:**
```
"Post on LinkedIn: Excited to announce our open-source project!"
"Create a LinkedIn post about AI in DevOps, add hashtags ai, devops, sre"
"Post to connections only: We're hiring engineers. DM me."
```

**What happens behind the scenes:**
1. Your text is validated (length, content)
2. Hashtags are formatted and appended: `#ai #devops #sre`
3. An API call is made to LinkedIn's REST API (`POST /rest/posts`)
4. The post URL is returned so you can see it live

---

#### 3. Create Post with Image (`linkedin_create_post_with_image`)

**What it does:** Uploads an image and creates a post with it attached -- all in one step. No need to upload the image separately first.

**Features:**
- Supports JPEG, PNG, GIF (max 8MB)
- Text + image + hashtags in one command
- Two-step upload handled automatically (initialize → upload binary → create post)

**Example prompts:**
```
"Post on LinkedIn with image ~/Desktop/infographic.png: Check out our Q1 results!"
"Create a post with image ~/Photos/team.jpg about our hackathon, add hashtags hackathon, teamwork"
```

---

#### 4. Publish Article (`linkedin_publish_article`)

**What it does:** Shares an article URL as a rich LinkedIn post with title, description, and optional cover image.

**Important:** LinkedIn's API requires a source URL for articles. This creates an article-style post that links to your content (blog, Medium article, etc.), not a native LinkedIn article.

**Example prompts:**
```
"Share my article 'Building MCP Servers' from https://myblog.com/mcp on LinkedIn"
"Publish an article with title 'AI in 2026' from https://example.com/ai with cover image ~/Desktop/cover.png"
```

---

### LinkedIn — Post Management (3 tools)

#### 5. Edit Post (`linkedin_edit_post`)

**What it does:** Updates the text of an existing LinkedIn post. Useful for fixing typos, adding context, or updating information after publishing.

**Input:** The post URN (returned when you create a post) and the new text.

**Example:**
```
"Edit my post urn:li:share:12345 to say: Updated: We're now hiring for 3 roles, not 2."
```

---

#### 6. Delete Post (`linkedin_delete_post`)

**What it does:** Permanently removes a LinkedIn post from your feed. This cannot be undone.

**Example:**
```
"Delete my LinkedIn post urn:li:share:12345"
```

---

#### 7. Upload Media (`linkedin_upload_media`)

**What it does:** Uploads an image to LinkedIn and returns a URN (a unique identifier) that you can reference when creating posts. This is the manual two-step approach -- most users should use `create_post_with_image` instead.

**Supported formats:** JPEG, PNG, GIF (max 8MB)

**Example:**
```
"Upload ~/Desktop/diagram.png to LinkedIn"
→ Returns: urn:li:image:D4E10... (use this in your next post)
```

---

### LinkedIn — Engagement (3 tools)

#### 8. Like Post (`linkedin_like_post`)

**What it does:** Likes a LinkedIn post. You can like your own posts or other people's posts.

**Example:**
```
"Like the post urn:li:share:12345"
```

---

#### 9. Get Comments (`linkedin_get_comments`)

**What it does:** Fetches all comments on a specific post. Returns each comment's author, text, timestamp, and comment URN (needed for replying).

**Features:**
- Configurable count (1-100 comments, default 20)
- Returns comment URNs for use with `reply_to_comment`

**Example:**
```
"Show me comments on my post urn:li:share:12345"
→ 1. [2026-04-10T08:15:00Z] urn:li:person:abc
   "Great post! Really insightful."
   URN: urn:li:comment:(urn:li:share:12345,456)
```

---

#### 10. Reply to Comment (`linkedin_reply_to_comment`)

**What it does:** Replies to a specific comment on your post. Useful for engaging with your audience without leaving Claude.

**Workflow:** First use `get_comments` to see comments and their URNs, then reply to specific ones.

**Example:**
```
"Show comments on urn:li:share:12345"
→ (see comment URNs)

"Reply to comment urn:li:comment:(urn:li:share:12345,456) with 'Thanks for reading! Glad you found it useful.'"
→ Reply posted successfully!
```

---

### LinkedIn — Analytics (4 tools)

#### 11. Get Profile (`linkedin_get_profile`)

**What it does:** Fetches your authenticated LinkedIn profile information.

**Returns:** Your name, LinkedIn member URN (your unique ID), and profile picture URL.

**Example:**
```
"Show my LinkedIn profile"
→ Name: Gurpreet Singh
→ URN: urn:li:person:abc123
→ Picture: https://media.licdn.com/...
```

---

#### 12. Get Profile Stats (`linkedin_get_profile_stats`)

**What it does:** Fetches your profile-level statistics -- follower count, and where available, profile views and search appearances.

**Example:**
```
"How many LinkedIn followers do I have?"
→ Followers: 4,832
```

**Note:** Profile views and search appearances require additional API permissions that may not be available with all LinkedIn app configurations.

---

#### 13. Get Post Stats (`linkedin_get_post_stats`)

**What it does:** Fetches detailed analytics for a specific post -- how many people saw it, engaged with it, and clicked through.

**Returns:**
- Impressions (how many times the post appeared in feeds)
- Likes
- Comments
- Shares (how many people reposted it)
- Clicks (link clicks, "see more" clicks, profile clicks)

**Example:**
```
"Show me stats for my post urn:li:share:12345"
→ 📊 Post Stats
  👁️ Impressions: 1,250
  👍 Likes: 42
  💬 Comments: 8
  🔄 Shares: 5
  🖱️ Clicks: 73
```

---

#### 14. Search Posts (`linkedin_search_posts`)

**What it does:** Searches your own LinkedIn posts by keyword or hashtag. Useful for finding old posts to reference, reshare, or check stats on.

**Features:**
- Searches post text (commentary) for matching keywords
- Configurable result count (1-50, default 10)
- Returns post URNs for use with other tools (stats, edit, delete)

**Example:**
```
"Search my LinkedIn posts for 'kubernetes'"
→ 🔍 Search results for "kubernetes" (2)
  1. [2026-04-01] Kubernetes is becoming invisible...
     URN: urn:li:share:111
  2. [2026-03-15] Our K8s migration taught me...
     URN: urn:li:share:222
```

---

### LinkedIn — Scheduling (3 tools)

#### 15. Schedule Post (`linkedin_schedule_post`)

**What it does:** Queues a post for future publication. The post is stored in a local SQLite database and automatically published when the scheduled time arrives.

**How scheduling works:**
1. Your post content is validated (same rules as `create_post`)
2. The scheduled time must be at least 5 minutes in the future
3. Post is saved to a local SQLite database (`data/scheduler.db`)
4. A background cron job checks every minute for posts that are due
5. When the time arrives, the post is published to LinkedIn
6. If publishing fails, it retries up to 3 times before marking as FAILED

**Example:**
```
"Schedule a LinkedIn post for tomorrow at 9am: Big announcement coming soon!"
```

**Important:** The schedule uses your server's clock. Make sure your machine's timezone is correct.

---

#### 16. List Scheduled Posts (`linkedin_list_scheduled`)

**What it does:** Shows all posts in the scheduling queue with their current status.

**Status values:**
- `PENDING` — Waiting to be published at the scheduled time
- `PUBLISHING` — Currently being sent to LinkedIn
- `PUBLISHED` — Successfully posted, includes the LinkedIn URL
- `FAILED` — Failed after 3 retry attempts, includes error message
- `CANCELLED` — Manually cancelled before publication

**Example:**
```
"Show my scheduled LinkedIn posts"
"List failed scheduled posts"
```

---

#### 17. Cancel Scheduled Post (`linkedin_cancel_scheduled`)

**What it does:** Cancels a pending scheduled post before it's published.

**Example:**
```
"List my pending scheduled posts"
→ [PENDING] 2026-04-15T09:00:00Z — "Big announcement..." (ID: fc557a0f-...)

"Cancel scheduled post fc557a0f-2833-40a5-9805-a75a017a92c1"
→ Scheduled post cancelled.
```

---

### Medium (2 tools)

#### 18. Publish to Medium (`medium_publish_article`)

**What it does:** Publishes an article to your Medium account.

**Features:**
- Supports Markdown and HTML content
- Up to 5 tags per article
- Three publish modes: `public` (visible to everyone), `draft` (only you can see), `unlisted` (accessible by link only)
- Optional canonical URL (tells search engines the original source, useful for cross-posting from your blog)

**Example:**
```
"Publish an article on Medium about observability in banking, tag it with sre, devops, observability"
```

**Setup required:** You need a Medium integration token. See [Medium Setup](#medium-publishing).

---

#### 19. Get Medium Profile (`medium_get_profile`)

**What it does:** Fetches your Medium account information -- username, display name, profile URL.

**Example:**
```
"Show my Medium profile"
→ Username: @gurpreetsingh
→ URL: https://medium.com/@gurpreetsingh
```

---

### Telegram Notifications (Automatic)

**Not a tool** -- notifications fire automatically in the background when configured.

**Events that trigger notifications:**
- LinkedIn post published successfully
- LinkedIn article shared
- Scheduled post auto-published at its scheduled time
- Scheduled post failed (after 3 retries)
- Medium article published
- Authentication completed

**Why it's useful:** If you schedule posts for the future, you'll get a Telegram ping when they go live (or if they fail). No need to keep checking.

---

## Quick Start

### Prerequisites

- **Node.js 20+** ([download](https://nodejs.org/))
- **Claude Desktop** ([download](https://claude.ai/download))
- A **personal LinkedIn account**
- (Optional) **Telegram** account for notifications
- (Optional) **Medium** account for article publishing

### 1. Clone and Build

```bash
git clone https://github.com/supersaiyane/AmplifyrMCP.git
cd AmplifyrMCP
npm install
npm run build
```

### 2. Create a LinkedIn Developer App

1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) and create an app
2. **Auth tab:** Add redirect URL `http://localhost:3456/callback`
3. **Products tab:** Request access to **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect**
4. **Auth tab:** Copy your **Client ID** and **Client Secret**

> Posts go to your **personal profile**, not the company page. The Page association is a LinkedIn requirement for app creation only.

See the full [LinkedIn App Setup](wiki/LinkedIn-App-Setup.md) guide for detailed steps.

### 3. Configure

```bash
cp .env.example .env
```

Set the two required values in `.env`:

```bash
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

### 4. Connect to Claude Desktop

Edit your Claude Desktop config:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/absolute/path/to/AmplifyrMCP/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "your_client_id",
        "LINKEDIN_CLIENT_SECRET": "your_client_secret",
        "TOKEN_ENCRYPTION_KEY": "pick_any_string_at_least_32_characters"
      }
    }
  }
}
```

### 5. Authenticate

Restart Claude Desktop, then in a chat:

> "Authenticate with LinkedIn"

Your browser opens, you authorize, done. **One-time only** -- tokens auto-refresh for ~1 year.

---

## Optional Integrations

### Telegram Notifications

Get push notifications when posts publish, scheduled posts fire, or something fails.

1. Message **@BotFather** on Telegram, send `/newbot`, get your bot token
2. Message your bot, visit `https://api.telegram.org/bot<TOKEN>/getUpdates` to get your chat ID
3. Add to `.env`:
   ```bash
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   ```

See [Telegram Setup](wiki/Telegram-Setup.md) for the full guide.

### Medium Publishing

Publish articles to Medium with markdown/HTML, tags, and draft/public/unlisted modes.

1. Go to [medium.com/me/settings/security](https://medium.com/me/settings/security)
2. Create an integration token
3. Add to `.env`:
   ```bash
   MEDIUM_INTEGRATION_TOKEN=your_token
   ```

See [Medium Setup](wiki/Medium-Setup.md) for the full guide.

---

## How Things Work Under the Hood

### The MCP Protocol

MCP (Model Context Protocol) is a standard created by Anthropic that lets AI assistants call external tools. When you say "post to LinkedIn," Claude doesn't actually know how to talk to LinkedIn. Instead:

1. Claude sees the available tools (registered by AmplifyrMCP)
2. Claude decides which tool to call based on your request
3. Claude sends a structured request to the tool (e.g., `{text: "...", visibility: "PUBLIC"}`)
4. AmplifyrMCP executes the tool (calls LinkedIn API)
5. AmplifyrMCP returns the result to Claude
6. Claude shows you the result in human-readable format

### Authentication Flow

```
You say "authenticate" → Claude calls linkedin_authenticate tool
  → AmplifyrMCP generates a login URL with a random state token
  → AmplifyrMCP starts a temporary HTTP server on port 3456
  → Your browser opens LinkedIn's login page
  → You approve → LinkedIn redirects to localhost:3456/callback?code=xxx
  → AmplifyrMCP exchanges the code for access + refresh tokens
  → Tokens are encrypted (AES-256-GCM) and saved to data/tokens.enc
  → Temporary server shuts down
  → Claude shows "Authenticated as Gurpreet Singh"
```

### Post Scheduling Architecture

```
You say "schedule post for tomorrow 9am"
  → Post content + scheduled time saved to SQLite (data/scheduler.db)
  → Background cron job runs every 60 seconds
  → When current time >= scheduled time:
      → Post status: PENDING → PUBLISHING
      → LinkedIn API called
      → Success: status → PUBLISHED, Telegram notification sent
      → Failure: retry up to 3 times, then status → FAILED
```

### Rate Limiting

LinkedIn has API rate limits. AmplifyrMCP enforces them locally before hitting the API:
- **Posts:** Max 100 per day (sliding 24-hour window)
- **API calls:** Max 150 per minute (sliding 60-second window)

If you hit a limit, you'll get a clear error with a "retry after X seconds" message.

### Retry Logic

When LinkedIn's API returns a temporary error:
- **HTTP 429** (rate limited): Waits for the `Retry-After` header value, then retries
- **HTTP 500/502/503/504** (server error): Retries with exponential backoff (1s, 2s, 4s)
- **Network errors** (timeout, connection reset): Same exponential backoff
- **Max 3 retries** per request, with random jitter to avoid thundering herd

---

## Architecture

```
Claude Desktop ──► MCP Protocol (stdio) ──► AmplifyrMCP Server (up to 20 tools)
                                                  │
                                                  ├──► LinkedIn App 1 (primary, port 3456)
                                                  │      Products: "Share on LinkedIn" + "Sign In"
                                                  │      ├── /rest/posts (create, edit, delete, search)
                                                  │      ├── /rest/images (upload)
                                                  │      └── /rest/networkSizes (followers)
                                                  │
                                                  ├──► LinkedIn App 2 (community, port 3457, optional)
                                                  │      Product: "Community Management API" only
                                                  │      ├── /rest/socialActions (post stats)
                                                  │      ├── /rest/socialActions/{urn}/comments (read/reply)
                                                  │      └── /rest/socialActions/{urn}/likes (like)
                                                  │
                                                  ├──► Medium API
                                                  ├──► Telegram Bot API
                                                  │
                                                  ├──► data/tokens.enc           (primary app tokens)
                                                  ├──► data/community-tokens.enc (community app tokens)
                                                  └──► data/scheduler.db         (SQLite scheduling queue)
```

**Why two LinkedIn apps?** LinkedIn requires the "Community Management API" product to be the only product on an app (for legal/security reasons). Since posting requires "Share on LinkedIn", you need a separate app for engagement features. If you only care about posting/scheduling, one app is enough.

**Tech stack:** TypeScript, MCP SDK, axios, better-sqlite3, Zod, pino, croner

See [Architecture](wiki/Architecture.md) for component details and design decisions.

---

## Automation Examples

```
# Full engagement workflow
"Show stats on my last post. Then show me the comments and reply to anyone who asked a question."

# Content calendar
"Draft 3 LinkedIn posts about AI engineering and schedule them for Tue/Wed/Thu at 10am."

# Blog-to-LinkedIn pipeline
"Read my blog post at [URL], summarize the key points, and post to LinkedIn with hashtags."

# Cross-platform publishing
"Write an article about MCP. Publish on Medium as a draft, then create a LinkedIn post linking to it."

# Post with image
"Create a LinkedIn post with image ~/Desktop/infographic.png about our Q1 results."

# Find and reshare
"Search my posts for 'kubernetes'. Show me stats on the best performing one."

# Batch scheduling
"Here are 5 post ideas. Schedule one per day starting tomorrow at 9am."
```

See [Automation Recipes](wiki/Automation-Recipes.md) for 15+ ready-to-paste prompt templates.

---

## Testing

All tools are tested with MSW (Mock Service Worker) -- HTTP requests are intercepted at the network level so **zero real LinkedIn API calls** are made during testing.

```bash
npm test           # Run all 41 tests
npm run test:watch # Watch mode
```

**Test coverage:**

| Area | Tests | What's covered |
|------|-------|----------------|
| Rate limiter | 5 | Window sliding, limit enforcement, retry-after |
| Token store | 5 | Encrypt/decrypt, wrong key, missing file |
| Content formatter | 15 | Formatting, validation, hashtags, edge cases |
| Post scheduler | 6 | Schedule, poll, retry, cancel, past-date |
| New tools | 10 | Stats, comments, reply, delete, edit, like, profile stats, search, post with image |

---

## Development

```bash
make dev          # Run with hot reload (tsx)
make dev-sse      # Run with SSE transport
make test         # Run tests
make typecheck    # Type check only
make check        # Type check + lint + tests
make docker-build # Build Docker image
make docker-run   # Run in container
```

### Project Structure

```
src/
  index.ts              # Entry point, dependency injection
  server.ts             # MCP server, 19 tool registrations
  config/               # Env validation (Zod), LinkedIn API constants
  auth/                 # OAuth 2.0, encrypted token storage
  api/                  # LinkedIn client (14 methods), Medium client, rate limiter, retry
  tools/                # 19 tool handlers (one file each)
  services/             # Content formatting, media handling, scheduling, notifications
  models/               # Zod schemas, error hierarchy, TypeScript types
  utils/                # Logger (pino/stderr), AES-256-GCM crypto, UUID

tests/
  setup.ts              # MSW handlers for all LinkedIn API endpoints
  api/                  # Rate limiter tests
  auth/                 # Token store tests
  services/             # Content formatter + scheduler tests
  tools/                # Tool handler tests (10 tests)
```

See [Contributing](wiki/Contributing.md) for code guidelines and how to add new tools.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Server crashes on start | Check `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are set |
| "Directory does not exist" | Create manually: `mkdir -p data` |
| Posts fail with 403 | Enable "Share on LinkedIn" product in your developer app |
| Posts fail with 426 | LinkedIn API version may need updating -- check `src/config/linkedin-api.ts` |
| Comments/stats fail with 403 | Enable **Community Management API** product in LinkedIn Developer Portal (Products tab). This is separate from OAuth scopes. May take 24-48h for approval. Re-authenticate after. |
| "Not authenticated" | Say "Authenticate with LinkedIn" in Claude Desktop |
| Token expired | Auto-refreshes. If refresh fails, re-authenticate |
| Claude Desktop no tools | Verify absolute path in config, run `npm run build`, restart Claude Desktop |
| JSON parse errors | Rebuild: `npm run build` |
| Telegram not arriving | Message your bot first, verify token and chat ID |
| Medium tools missing | Set `MEDIUM_INTEGRATION_TOKEN` and restart |
| Medium 401 error | Generate new token at medium.com/me/settings/security |

See [Troubleshooting](wiki/Troubleshooting.md) for detailed symptom-cause-fix entries.

---

## Documentation

Full wiki with 18 pages covering setup, usage, architecture, and troubleshooting:

| Section | Pages |
|---------|-------|
| **Getting Started** | [Concepts](wiki/Concepts.md), [Installation](wiki/Installation.md), [Quick Start](wiki/Quick-Start-Guide.md), [Configuration](wiki/Configuration.md) |
| **Architecture** | [System Overview](wiki/Architecture.md), [Authentication](wiki/Authentication.md) |
| **Integrations** | [LinkedIn App Setup](wiki/LinkedIn-App-Setup.md), [Telegram Setup](wiki/Telegram-Setup.md), [Medium Setup](wiki/Medium-Setup.md) |
| **Tools & Automation** | [Tools Reference](wiki/Tools-Reference.md), [Automation Recipes](wiki/Automation-Recipes.md) |
| **Operations** | [Docker Deployment](wiki/Docker-Deployment.md), [Troubleshooting](wiki/Troubleshooting.md) |
| **Reference** | [Glossary](wiki/Glossary.md), [FAQ](wiki/FAQ.md), [Contributing](wiki/Contributing.md) |

---

## License

MIT
