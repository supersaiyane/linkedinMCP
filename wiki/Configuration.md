# Configuration

All configuration is done through environment variables. You can set them in a `.env` file in the project root, or in the Claude Desktop config `env` block.

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `LINKEDIN_CLIENT_ID` | Your LinkedIn app's Client ID | `86abc123def456` |
| `LINKEDIN_CLIENT_SECRET` | Your LinkedIn app's Client Secret | `sK8x...` |

### OAuth

| Variable | Default | Description |
|----------|---------|-------------|
| `LINKEDIN_REDIRECT_URI` | `http://localhost:3456/callback` | OAuth callback URL. Must match what's in your LinkedIn app settings. |

### Token Storage

| Variable | Default | Description |
|----------|---------|-------------|
| `TOKEN_STORE_TYPE` | `file` | `file` = encrypted file on disk, `env` = read tokens from env vars |
| `TOKEN_STORE_PATH` | `./data/tokens.enc` | Path to the encrypted token file |
| `TOKEN_ENCRYPTION_KEY` | `CHANGE_ME_IN_PRODUCTION_32CHARS!!` | AES-256 encryption key for token file. Must be at least 32 characters. |

### CI/CD Tokens (when TOKEN_STORE_TYPE=env)

| Variable | Default | Description |
|----------|---------|-------------|
| `LINKEDIN_ACCESS_TOKEN` | _(none)_ | Pre-obtained access token |
| `LINKEDIN_REFRESH_TOKEN` | _(none)_ | Pre-obtained refresh token |

Use these when running in CI/CD or headless environments where browser-based OAuth isn't possible.

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TRANSPORT` | `stdio` | `stdio` for Claude Desktop, `sse` for remote HTTP clients |
| `SSE_PORT` | `3001` | Port for SSE transport mode |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error` |

### Scheduler

| Variable | Default | Description |
|----------|---------|-------------|
| `SCHEDULER_ENABLED` | `true` | Enable/disable the post scheduler |
| `SCHEDULER_DB_PATH` | `./data/scheduler.db` | Path to the SQLite scheduler database |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_POSTS_PER_DAY` | `100` | Maximum posts per 24-hour window |
| `RATE_LIMIT_API_PER_MINUTE` | `150` | Maximum API calls per 60-second window |

## Where to Set Variables

### Option A: `.env` File (for local development)

```bash
cp .env.example .env
# Edit .env with your values
```

The `.env` file is gitignored and stays on your machine.

### Option B: Claude Desktop Config (recommended for daily use)

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/path/to/linkedinMCP/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "your_id",
        "LINKEDIN_CLIENT_SECRET": "your_secret",
        "TOKEN_ENCRYPTION_KEY": "your_32_char_key_here_change_me!!"
      }
    }
  }
}
```

This keeps secrets out of the project directory entirely. Only set what you need -- defaults handle the rest.

### Option C: System Environment Variables

```bash
export LINKEDIN_CLIENT_ID=your_id
export LINKEDIN_CLIENT_SECRET=your_secret
```

Works for any deployment method.

## Minimal Config

The absolute minimum to get running:

```bash
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

Everything else has sensible defaults.

## Production Config

For production or shared deployments, change:

```bash
TOKEN_ENCRYPTION_KEY=a_strong_random_32_character_key!
LOG_LEVEL=warn
MCP_TRANSPORT=sse
SSE_PORT=3001
```

## Config Validation

The server validates all config at startup using Zod schemas. If any required variable is missing or invalid, you'll see a clear error message listing exactly what's wrong:

```
Invalid environment configuration:
  - LINKEDIN_CLIENT_ID: Required
  - LINKEDIN_CLIENT_SECRET: Required
```
