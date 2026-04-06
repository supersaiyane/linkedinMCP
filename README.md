# LinkedIn MCP Server

An MCP (Model Context Protocol) server that connects Claude to your personal LinkedIn account. Authenticate once, then use natural language in Claude Desktop to create posts, publish articles, upload images, and schedule content.

**Author:** Gurpreet Singh ([linkedin.com/in/gurpreettsengh](https://linkedin.com/in/gurpreettsengh))

---

## What Can It Do?

| Command (just ask Claude) | What Happens |
|---|---|
| "Authenticate with LinkedIn" | Opens browser, logs you in via OAuth |
| "Create a LinkedIn post about AI trends" | Publishes a text post to your feed |
| "Post about my new project with hashtags typescript, opensource" | Post with hashtags appended |
| "Get my LinkedIn profile" | Shows your name, URN, and profile info |
| "Upload this image: ~/Desktop/photo.jpg" | Uploads image, returns URN for posts |
| "Publish an article titled 'My Guide' from https://myblog.com/guide" | Shares article link as rich post |
| "Schedule a post for tomorrow at 9am: Excited to announce..." | Queues post for future publishing |
| "List my scheduled posts" | Shows all pending/published/failed scheduled posts |

---

## Setup Guide (Step by Step)

### Prerequisites

- **Node.js 20+** installed ([download](https://nodejs.org/))
- **Claude Desktop** installed ([download](https://claude.ai/download))
- A **personal LinkedIn account**

### Step 1: Create a LinkedIn Developer App

1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
2. Click **"Create app"**
3. Fill in the form:
   - **App name:** anything you want (e.g., "My LinkedIn MCP")
   - **LinkedIn Page:** LinkedIn requires this, but it does NOT affect where posts go. Your posts go to your **personal profile**. If you don't have a Page, create a quick placeholder.
   - **App logo:** any image
4. After creation, go to the **"Auth"** tab
5. Under **OAuth 2.0 settings**, click **"Add redirect URL"** and add:
   ```
   http://localhost:3456/callback
   ```
6. Go to the **"Products"** tab and request access to:
   - **Share on LinkedIn** (grants `w_member_social` -- required for posting)
   - **Sign In with LinkedIn using OpenID Connect** (grants `openid`, `profile` -- required for reading your profile)
7. Wait for approval (usually instant for "Share on LinkedIn")
8. Go back to the **"Auth"** tab and copy:
   - **Client ID**
   - **Primary Client Secret**

> **Important:** Without the "Share on LinkedIn" product, posts will fail with a 403 error.

### Step 2: Clone and Install

```bash
# Clone the repo
git clone <your-repo-url>
cd "linkedIn MCP"

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 3: Configure Environment

```bash
# Copy the example env file
cp .env.example .env
```

Open `.env` in your editor and fill in **these two required values**:

```bash
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
```

That's it for minimum setup. The other values have sensible defaults.

#### Optional: Change the encryption key

The server encrypts your LinkedIn tokens on disk. The default key works for development, but for extra security:

```bash
TOKEN_ENCRYPTION_KEY=pick_any_string_at_least_32_chars
```

### Step 4: Connect to Claude Desktop

Open your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add this to the `mcpServers` section (replace the path with your actual project path):

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/full/path/to/linkedIn MCP/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "your_client_id",
        "LINKEDIN_CLIENT_SECRET": "your_client_secret",
        "TOKEN_ENCRYPTION_KEY": "your_32_char_encryption_key_here!"
      }
    }
  }
}
```

> **Tip:** You can put secrets in `env` here instead of the `.env` file. Either works -- Claude Desktop passes `env` values as environment variables to the server process.

### Step 5: Restart Claude Desktop

Quit and reopen Claude Desktop. You should see a hammer icon indicating MCP tools are available.

### Step 6: Authenticate

In a Claude Desktop chat, type:

> "Authenticate with LinkedIn"

Your browser will open. Sign in to LinkedIn and authorize the app. Once done, you'll see a success page in the browser and Claude will confirm with your profile info.

**You only need to do this once.** Tokens are saved encrypted on disk and auto-refresh.

---

## Available Tools

### linkedin_authenticate
Starts the OAuth flow. Opens your browser to LinkedIn login. After approval, tokens are stored encrypted locally. You only need to run this once -- tokens auto-refresh for ~1 year.

### linkedin_create_post
Creates a text post on your personal LinkedIn feed.
- **text** (required): Post content, up to 3000 characters
- **visibility** (optional): `PUBLIC` (default) or `CONNECTIONS`
- **hashtags** (optional): Array of hashtags (without `#`), appended to the post

**Example prompts:**
- "Post on LinkedIn: Just shipped v2.0 of our API!"
- "Create a LinkedIn post about the future of AI with hashtags ai, machinelearning, tech"
- "Post to connections only: Looking for beta testers for my new project"

### linkedin_publish_article
Shares an article link as a rich post with title and description.
- **title** (required): Article title, up to 200 characters
- **body** (required): Description text
- **source_url** (required): URL of the article
- **cover_image_path** (optional): Local path to a cover image
- **visibility** (optional): `PUBLIC` or `CONNECTIONS`

**Example prompts:**
- "Publish my article 'Getting Started with MCP' from https://myblog.com/mcp-guide"
- "Share this article on LinkedIn with a cover image from ~/Desktop/cover.png"

### linkedin_upload_media
Uploads an image to LinkedIn and returns a URN you can reference in posts.
- **file_path** (required): Path to image (jpg, png, gif -- max 8MB)
- **alt_text** (optional): Alt text for accessibility

**Example prompts:**
- "Upload ~/Desktop/screenshot.png to LinkedIn"

### linkedin_get_profile
Fetches your LinkedIn profile info (name, URN, picture).

**Example prompts:**
- "Show my LinkedIn profile"
- "What's my LinkedIn URN?"

### linkedin_schedule_post
Schedules a post for future publication. The server checks every minute and publishes when the time arrives.
- **text** (required): Post content
- **scheduled_time** (required): ISO 8601 datetime (must be at least 5 minutes in the future)
- **visibility** (optional): `PUBLIC` or `CONNECTIONS`
- **hashtags** (optional): Array of hashtags

**Example prompts:**
- "Schedule a LinkedIn post for tomorrow at 9am: Excited to announce our Series A!"
- "Schedule a post for 2026-04-10T14:00:00Z about our product launch"

### linkedin_list_scheduled
Lists scheduled posts, optionally filtered by status.
- **status** (optional): `PENDING`, `PUBLISHED`, or `FAILED`

**Example prompts:**
- "Show my scheduled LinkedIn posts"
- "List failed scheduled posts"

---

## Automation Ideas

Once the MCP server is connected to Claude Desktop, you can build powerful workflows by just talking to Claude:

### Content Calendar
> "Every Monday, help me draft 3 LinkedIn posts for the week about AI engineering, and schedule them for Tuesday, Wednesday, and Thursday at 10am."

### Blog-to-LinkedIn Pipeline
> "Read my latest blog post at [URL] and create a LinkedIn post summarizing the key points with relevant hashtags."

### Engagement Boost
> "Look at this draft post and improve it for LinkedIn engagement. Make it concise, add a hook, and suggest 5 hashtags."

### Batch Scheduling
> "Here are 5 post ideas. Schedule them one per day starting tomorrow at 9am EST."

### Profile Check
> "Get my LinkedIn profile and verify my authentication is still working."

---

## Development

### Run locally (dev mode)

```bash
# Starts the server with hot reload via tsx
make dev

# Or with SSE transport (for remote/web clients)
make dev-sse
```

### Run checks

```bash
# Type check + tests
make check

# Individual commands
make typecheck    # TypeScript type checking
make test         # Run all tests
make lint         # ESLint
```

### Project structure

```
src/
  index.ts              # Entry point, dependency injection
  server.ts             # MCP server, tool registration
  config/
    env.ts              # Environment config with zod validation
    linkedin-api.ts     # All LinkedIn API constants
  auth/
    auth-manager.ts     # OAuth 2.0 flow
    callback-server.ts  # Temporary HTTP server for OAuth callback
    token-store.ts      # TokenStore interface
    file-token-store.ts # AES-256-GCM encrypted file storage
    env-token-store.ts  # Read-only tokens from env vars (CI/CD)
  api/
    linkedin-client.ts  # LinkedIn REST API client
    rate-limiter.ts     # Sliding window rate limiter
    retry.ts            # Axios retry interceptor
  tools/
    *.tool.ts           # One file per MCP tool
  services/
    content-formatter.ts # Text/hashtag processing
    media-handler.ts     # File reading, MIME detection
    post-scheduler.ts    # SQLite queue + cron dispatcher
  models/
    schemas.ts          # Zod schemas for all data types
    errors.ts           # Typed error hierarchy
    types.ts            # TypeScript type exports
  utils/
    logger.ts           # Pino logger (stderr in stdio mode)
    crypto.ts           # AES-256-GCM encrypt/decrypt
    id.ts               # UUID generation
```

### Docker

```bash
make docker-build
make docker-run
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Server crashes on start | Check that `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are set |
| "Directory does not exist" error | The `data/` folder is created automatically -- if it fails, create it manually: `mkdir -p data` |
| Posts fail with 403 | You need the "Share on LinkedIn" product approved in your developer app |
| "Not authenticated" error | Run "Authenticate with LinkedIn" in Claude Desktop |
| Token expired | Tokens auto-refresh. If refresh fails, re-authenticate |
| Claude Desktop doesn't show tools | Check your `claude_desktop_config.json` path is correct and restart Claude Desktop |
| Logs corrupting MCP protocol | This is fixed -- logs go to stderr. If you see JSON errors, rebuild with `npm run build` |

---

## License

MIT
