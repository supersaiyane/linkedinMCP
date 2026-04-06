---
title: Configuration
sidebar_label: Configuration
sidebar_position: 4
audience: L1-L5
---

# Configuration

**TL;DR:** Set `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` to get started. Everything else has sensible defaults. Production deployments should also set `TOKEN_ENCRYPTION_KEY` and adjust `LOG_LEVEL`.

**Prerequisite knowledge:** You should have a LinkedIn developer app created ([LinkedIn App Setup](LinkedIn-App-Setup)) and Node.js 20+ installed ([Getting Started](Getting-Started)).

---

## Tier 1: Minimal Config (Novice)

The absolute minimum required to run the server:

```bash
LINKEDIN_CLIENT_ID=<YOUR_LINKEDIN_CLIENT_ID>
LINKEDIN_CLIENT_SECRET=<YOUR_LINKEDIN_CLIENT_SECRET>
```

With these two variables set, the server will:

- Use the `file` token store at `./data/tokens.enc`
- Listen on stdio transport (for Claude Desktop)
- Enable the post scheduler
- Apply default rate limits (100 posts/day, 150 API calls/minute)
- Log at `info` level to stderr

This is sufficient for local development and personal use.

---

## Tier 2: Production Config (Operator)

For shared deployments, CI/CD pipelines, or any environment where security matters:

```bash
# Required
LINKEDIN_CLIENT_ID=<YOUR_LINKEDIN_CLIENT_ID>
LINKEDIN_CLIENT_SECRET=<YOUR_LINKEDIN_CLIENT_SECRET>

# Security: replace the default encryption key
TOKEN_ENCRYPTION_KEY=<A_STRONG_RANDOM_32_CHARACTER_KEY>

# Logging: reduce noise in production
LOG_LEVEL=warn

# Transport: use SSE for remote access
MCP_TRANSPORT=sse
SSE_PORT=3001

# Optional integrations
TELEGRAM_BOT_TOKEN=<YOUR_BOT_TOKEN>
TELEGRAM_CHAT_ID=<YOUR_CHAT_ID>
MEDIUM_INTEGRATION_TOKEN=<YOUR_MEDIUM_TOKEN>
```

For CI/CD environments where browser-based OAuth is not possible:

```bash
TOKEN_STORE_TYPE=env
LINKEDIN_ACCESS_TOKEN=<PRE_OBTAINED_ACCESS_TOKEN>
LINKEDIN_REFRESH_TOKEN=<PRE_OBTAINED_REFRESH_TOKEN>
```

---

## Tier 3: Full Reference (Architect)

### Complete Environment Variable Table

| Variable | Type | Default | Required | Description |
|---|---|---|---|---|
| `LINKEDIN_CLIENT_ID` | `string` | _(none)_ | Yes | OAuth 2.0 Client ID from your LinkedIn developer app. Found under the Auth tab at linkedin.com/developers/apps. |
| `LINKEDIN_CLIENT_SECRET` | `string` | _(none)_ | Yes | OAuth 2.0 Client Secret from your LinkedIn developer app. Treat as a secret -- never commit to version control. |
| `LINKEDIN_REDIRECT_URI` | `string` (URL) | `http://localhost:3456/callback` | No | OAuth callback URL. Must match exactly what is configured in your LinkedIn app's Auth settings. |
| `TOKEN_STORE_TYPE` | `"file"` or `"env"` | `file` | No | How tokens are stored. `file` = AES-256-GCM encrypted file on disk. `env` = read tokens from environment variables (read-only, for CI/CD). |
| `TOKEN_STORE_PATH` | `string` (path) | `./data/tokens.enc` | No | File path for the encrypted token store. Relative paths resolve from the project root. Only used when `TOKEN_STORE_TYPE=file`. |
| `TOKEN_ENCRYPTION_KEY` | `string` (min 32 chars) | `CHANGE_ME_IN_PRODUCTION_32CHARS!!` | No | AES-256-GCM encryption key for the token file. The default value is insecure -- replace it in any non-local environment. Key is SHA-256 hashed internally to produce exactly 32 bytes. |
| `LINKEDIN_ACCESS_TOKEN` | `string` | _(none)_ | No | Pre-obtained LinkedIn access token. Only used when `TOKEN_STORE_TYPE=env`. |
| `LINKEDIN_REFRESH_TOKEN` | `string` | _(none)_ | No | Pre-obtained LinkedIn refresh token. Only used when `TOKEN_STORE_TYPE=env`. |
| `MCP_TRANSPORT` | `"stdio"` or `"sse"` | `stdio` | No | Transport protocol. `stdio` for Claude Desktop (JSON-RPC over stdin/stdout). `sse` for remote HTTP clients (Server-Sent Events on a configurable port). |
| `SSE_PORT` | `number` | `3001` | No | TCP port for the SSE HTTP server. Only used when `MCP_TRANSPORT=sse`. |
| `LOG_LEVEL` | `"debug"`, `"info"`, `"warn"`, or `"error"` | `info` | No | Minimum log level. In stdio mode, all logs go to stderr to avoid corrupting the MCP protocol stream on stdout. |
| `SCHEDULER_ENABLED` | `boolean` | `true` | No | Enable or disable the post scheduler. When disabled, the `linkedin_schedule_post` and `linkedin_list_scheduled` tools are not registered. |
| `SCHEDULER_DB_PATH` | `string` (path) | `./data/scheduler.db` | No | File path for the SQLite scheduler database. Relative paths resolve from the project root. Created automatically on first use. |
| `RATE_LIMIT_POSTS_PER_DAY` | `number` | `100` | No | Maximum number of posts allowed in a sliding 24-hour window. This is a local safeguard -- LinkedIn also enforces its own server-side limits. |
| `RATE_LIMIT_API_PER_MINUTE` | `number` | `150` | No | Maximum API calls allowed in a sliding 60-second window. |
| `TELEGRAM_BOT_TOKEN` | `string` | _(none)_ | No | Telegram Bot API token obtained from @BotFather. Both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` must be set to enable notifications. See [Telegram Setup](Telegram-Setup). |
| `TELEGRAM_CHAT_ID` | `string` | _(none)_ | No | Telegram chat ID where notifications are sent. Obtain by messaging your bot and checking the `/getUpdates` endpoint. See [Telegram Setup](Telegram-Setup). |
| `MEDIUM_INTEGRATION_TOKEN` | `string` | _(none)_ | No | Medium API integration token. When set, enables `medium_publish_article` and `medium_get_profile` tools. See [Medium Setup](Medium-Setup). |

---

## Configuration Methods

### Method 1: `.env` File (Local Development)

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# LinkedIn OAuth 2.0 (REQUIRED)
# Get these from https://www.linkedin.com/developers/apps
LINKEDIN_CLIENT_ID=86abc123def456
LINKEDIN_CLIENT_SECRET=sK8xAbCdEfGhIjKl

# OAuth callback -- must match your LinkedIn app settings
LINKEDIN_REDIRECT_URI=http://localhost:3456/callback

# Token Storage
TOKEN_STORE_TYPE=file
TOKEN_STORE_PATH=./data/tokens.enc
TOKEN_ENCRYPTION_KEY=replace_this_with_a_strong_32char_key

# For CI/CD: set TOKEN_STORE_TYPE=env and provide tokens directly
# LINKEDIN_ACCESS_TOKEN=AQV...
# LINKEDIN_REFRESH_TOKEN=AQX...

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

# Telegram Notifications (optional)
# TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
# TELEGRAM_CHAT_ID=987654321

# Medium Integration (optional)
# MEDIUM_INTEGRATION_TOKEN=2abc...
```

The `.env` file is listed in `.gitignore` and stays on your machine.

### Method 2: Claude Desktop Config (Recommended for Daily Use)

Edit your `claude_desktop_config.json` (location varies by OS):

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["<ABSOLUTE_PATH_TO_PROJECT>/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "<YOUR_LINKEDIN_CLIENT_ID>",
        "LINKEDIN_CLIENT_SECRET": "<YOUR_LINKEDIN_CLIENT_SECRET>",
        "TOKEN_ENCRYPTION_KEY": "<YOUR_32_CHAR_ENCRYPTION_KEY>",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

This approach keeps secrets out of the project directory. Only set variables where you need to override the default -- the server applies defaults for everything else.

Important notes:

- The `args` path must be absolute and point to the compiled `dist/index.js`, not `src/index.ts`.
- Run `npm run build` before using this method.
- Restart Claude Desktop after changing this file (quit and reopen, not close the window).

### Method 3: System Environment Variables

```bash
export LINKEDIN_CLIENT_ID=<YOUR_LINKEDIN_CLIENT_ID>
export LINKEDIN_CLIENT_SECRET=<YOUR_LINKEDIN_CLIENT_SECRET>
export TOKEN_ENCRYPTION_KEY=<YOUR_32_CHAR_ENCRYPTION_KEY>
```

This works for any deployment method and takes effect for all processes in the current shell session. For persistence, add exports to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.).

---

## Config Validation

The server validates all configuration at startup using Zod schemas. If any required variable is missing or any value fails validation, the server prints a specific error and exits with code 1:

```
Invalid environment configuration:
  - LINKEDIN_CLIENT_ID: Required
  - TOKEN_ENCRYPTION_KEY: Encryption key must be at least 32 chars
```

This is intentional fail-fast behavior. The server will not start with incomplete or invalid configuration.

---

## Precedence

When the same variable is set in multiple places, this is the resolution order (highest priority first):

1. System environment variables (including those set via Claude Desktop `env` block)
2. `.env` file values

The Claude Desktop `env` block injects values as system environment variables before the server process starts, so they take precedence over `.env` file entries.

---

## Key Takeaways

- Two variables are required: `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`. Everything else has defaults.
- Replace `TOKEN_ENCRYPTION_KEY` in any environment beyond local development.
- In stdio mode (the default for Claude Desktop), all logs go to stderr. This is critical -- stdout is reserved for the MCP protocol.
- Optional integrations (Telegram, Medium) activate when their respective tokens are set.
- The server validates all config at startup and fails with specific error messages.

## Related Pages

- [Getting Started](Getting-Started) -- Installation and first run
- [LinkedIn App Setup](LinkedIn-App-Setup) -- How to create a LinkedIn developer app
- [Telegram Setup](Telegram-Setup) -- Telegram notification configuration
- [Medium Setup](Medium-Setup) -- Medium integration configuration
- [Authentication](Authentication) -- OAuth 2.0 flow and token management
- [Troubleshooting](Troubleshooting) -- Common configuration errors and fixes
