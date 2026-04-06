# AmplifyrMCP

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)

Amplify your content reach. An MCP server that connects Claude Desktop to **LinkedIn**, **Medium**, and **Telegram**. Post to LinkedIn, publish Medium articles, schedule content, and get Telegram notifications -- all through natural language.

**Author:** Gurpreet Singh ([linkedin.com/in/gurpreettsengh](https://linkedin.com/in/gurpreettsengh))

---

## Features

- **9 MCP tools** for LinkedIn and Medium content management
- **OAuth 2.0** authentication with AES-256-GCM encrypted token storage
- **Post scheduling** with SQLite-backed queue and automatic retry
- **Telegram notifications** for post publish, schedule fire, and failure events
- **Medium publishing** with markdown/HTML, tags, draft/public/unlisted modes
- **Rate limiting** with sliding window to stay within LinkedIn API limits
- **Retry logic** with exponential backoff for transient failures
- **Zero-config startup** -- two environment variables and you're running

## What Can It Do?

| Ask Claude (natural language) | What Happens |
|---|---|
| "Authenticate with LinkedIn" | Opens browser, logs you in via OAuth 2.0 |
| "Create a LinkedIn post about AI trends" | Publishes a text post to your personal feed |
| "Post about my project with hashtags typescript, opensource" | Post with hashtags appended automatically |
| "Get my LinkedIn profile" | Returns your name, URN, and profile info |
| "Upload this image: ~/Desktop/photo.jpg" | Uploads image to LinkedIn, returns URN for posts |
| "Publish an article titled 'My Guide' from https://myblog.com/guide" | Shares article link as a rich LinkedIn post |
| "Schedule a post for tomorrow at 9am: Excited to announce..." | Queues post for future publishing |
| "List my scheduled posts" | Shows all pending/published/failed scheduled posts |
| "Publish an article on Medium about AI" | Creates a Medium article (draft or public) |
| "Show my Medium profile" | Returns your Medium username and profile URL |

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

## All 9 Tools

### LinkedIn Tools

| Tool | Description |
|------|-------------|
| `linkedin_authenticate` | OAuth 2.0 login via browser. Tokens encrypted on disk, auto-refresh for ~1 year. |
| `linkedin_create_post` | Text post (up to 3000 chars) with optional hashtags and visibility control. |
| `linkedin_publish_article` | Share an article URL as a rich post with title, description, and optional cover image. |
| `linkedin_upload_media` | Upload an image (jpg/png/gif, max 8MB) and get a URN for use in posts. |
| `linkedin_get_profile` | Fetch your LinkedIn name, URN, and profile picture. |
| `linkedin_schedule_post` | Schedule a post for future publication (min 5 minutes ahead, auto-retry on failure). |
| `linkedin_list_scheduled` | List scheduled posts filtered by status (PENDING, PUBLISHED, FAILED). |

### Medium Tools

| Tool | Description |
|------|-------------|
| `medium_publish_article` | Publish markdown/HTML article with up to 5 tags. Supports draft, public, and unlisted modes. Set canonical URL for cross-posting. |
| `medium_get_profile` | Fetch your Medium username and profile URL. |

### Telegram Notifications (automatic)

Not a tool -- notifications fire automatically when configured:
- LinkedIn post/article published
- Scheduled post published or failed (after 3 retries)
- Medium article published
- Authentication completed

---

## Automation Examples

```
# Content calendar
"Draft 3 LinkedIn posts about AI engineering and schedule them for Tue/Wed/Thu at 10am."

# Blog-to-LinkedIn pipeline
"Read my blog post at [URL], summarize the key points, and post to LinkedIn with hashtags."

# Cross-platform publishing
"Write an article about MCP. Publish on Medium as a draft, then create a LinkedIn post linking to it."

# Batch scheduling
"Here are 5 post ideas. Schedule one per day starting tomorrow at 9am."

# Engagement optimization
"Here's my draft. Rewrite it for LinkedIn engagement -- add a hook, short paragraphs, and a question at the end."
```

See [Automation Recipes](wiki/Automation-Recipes.md) for 15+ ready-to-paste prompt templates.

---

## Architecture

```
Claude Desktop --> MCP Protocol (stdio) --> LinkedIn MCP Server --> LinkedIn API
                                                    |           --> Medium API
                                                    |           --> Telegram Bot API
                                                    |
                                              data/tokens.enc  (AES-256-GCM)
                                              data/scheduler.db (SQLite)
```

**Tech stack:** TypeScript, MCP SDK, axios, better-sqlite3, Zod, pino, croner

See [Architecture](wiki/Architecture.md) for component details and design decisions.

---

## Development

```bash
make dev          # Run with hot reload (tsx)
make dev-sse      # Run with SSE transport
make check        # Type check + lint + tests
make docker-build # Build Docker image
make docker-run   # Run in container
```

### Project Structure

```
src/
  index.ts              # Entry point, dependency injection
  server.ts             # MCP server, tool registration
  config/               # Env validation (Zod), LinkedIn API constants
  auth/                 # OAuth 2.0, encrypted token storage
  api/                  # LinkedIn client, Medium client, rate limiter, retry
  tools/                # 9 tool handlers (one file each)
  services/             # Content formatting, media handling, scheduling, notifications
  models/               # Zod schemas, error hierarchy, TypeScript types
  utils/                # Logger (pino/stderr), AES-256-GCM crypto, UUID
```

See [Contributing](wiki/Contributing.md) for code guidelines and how to add new tools.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Server crashes on start | Check `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are set |
| "Directory does not exist" | Create manually: `mkdir -p data` |
| Posts fail with 403 | Enable "Share on LinkedIn" product in your developer app |
| "Not authenticated" | Say "Authenticate with LinkedIn" in Claude Desktop |
| Token expired | Auto-refreshes. If refresh fails, re-authenticate |
| Claude Desktop no tools | Verify absolute path in config, run `npm run build`, restart Claude Desktop |
| JSON parse errors | Rebuild: `npm run build` (fixes dotenv stdout issue) |
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
