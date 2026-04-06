---
title: Docker Deployment
sidebar_label: Docker Deployment
sidebar_position: 13
audience: L2-L4
---

# Docker Deployment

How to build, configure, and run the LinkedIn MCP Server in a Docker container.

**TL;DR:** The server ships with a multi-stage Dockerfile that produces a slim production image. Use `docker compose up` with an `.env` file and a volume mount for persistent data. Docker deployments use SSE transport (not stdio).

**Prerequisite knowledge:** Basic Docker and Docker Compose usage (building images, running containers, mounting volumes). Familiarity with [Configuration](Configuration) environment variables.

---

## Dockerfile Walkthrough

The project uses a multi-stage build to keep the production image small. The Dockerfile lives at the project root.

### Stage 1: Builder

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build
```

**What this does:**

1. Starts from `node:20-slim` -- a minimal Debian-based Node.js image.
2. Copies `package.json` and `package-lock.json` first, then runs `npm ci`. This layer is cached as long as dependencies do not change, which speeds up rebuilds.
3. Copies the TypeScript source and compiles it to JavaScript in `dist/`.

### Stage 2: Production

```dockerfile
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

**What this does:**

1. Starts a fresh `node:20-slim` image with no build tools or devDependencies.
2. Installs only production dependencies (`--omit=dev`).
3. Copies the compiled `dist/` directory from the builder stage.
4. Creates `/app/data` for runtime files (encrypted tokens, scheduler database) and declares it as a volume.
5. Sets the transport to SSE -- stdio does not work inside a container because there is no MCP client on the other end of stdin/stdout.
6. Exposes port 3001 for SSE connections.

The final image contains no TypeScript source, no devDependencies, and no build tooling.

---

## docker-compose.yml

```yaml
version: "3.8"

services:
  linkedin-mcp:
    build: .
    ports:
      - "3001:3001"
    env_file:
      - .env
    environment:
      - MCP_TRANSPORT=sse
      - NODE_ENV=production
    volumes:
      - mcp-data:/app/data
    restart: unless-stopped

volumes:
  mcp-data:
```

This configuration:

- Builds the image from the project root Dockerfile.
- Maps host port 3001 to container port 3001.
- Reads environment variables from `.env` (see below).
- Forces SSE transport regardless of what `.env` says.
- Mounts a named volume `mcp-data` at `/app/data` for token and scheduler persistence.
- Restarts the container on crash unless you explicitly stop it.

---

## Build and Run

### Build the image

```bash
docker compose build
```

Expected output:

```text
[+] Building 42.3s (13/13) FINISHED
 => [builder] npm ci                                      12.1s
 => [builder] npm run build                                3.2s
 => [production] npm ci --omit=dev                         8.4s
 => exporting to image                                     0.3s
```

### Start the server

```bash
docker compose up -d
```

Expected output:

```text
[+] Running 1/1
 ✔ Container linkedin-mcp-linkedin-mcp-1  Started
```

### Verify it is running

```bash
docker compose logs -f
```

Expected output:

```json
{"level":"info","service":"linkedin-mcp","msg":"Server started","transport":"sse","port":3001}
```

Press `Ctrl+C` to stop tailing logs.

### Stop the server

```bash
docker compose down
```

This stops the container but preserves the `mcp-data` volume. Token files and the scheduler database survive restarts.

---

## Environment Variable Configuration

Create a `.env` file in the project root before running `docker compose up`. This file is read by the `env_file` directive.

```bash
# .env (Docker)

# LinkedIn OAuth (REQUIRED)
LINKEDIN_CLIENT_ID=<YOUR_CLIENT_ID>
LINKEDIN_CLIENT_SECRET=<YOUR_CLIENT_SECRET>
LINKEDIN_REDIRECT_URI=http://localhost:3456/callback

# Token storage
TOKEN_STORE_TYPE=file
TOKEN_STORE_PATH=/app/data/tokens.enc
TOKEN_ENCRYPTION_KEY=<YOUR_32_CHAR_KEY>

# Transport (always SSE in Docker)
MCP_TRANSPORT=sse
SSE_PORT=3001
LOG_LEVEL=info

# Scheduler
SCHEDULER_ENABLED=true
SCHEDULER_DB_PATH=/app/data/scheduler.db

# Rate limits
RATE_LIMIT_POSTS_PER_DAY=100
RATE_LIMIT_API_PER_MINUTE=150

# Medium (optional)
# MEDIUM_INTEGRATION_TOKEN=<YOUR_MEDIUM_TOKEN>

# Telegram (optional)
# TELEGRAM_BOT_TOKEN=<YOUR_BOT_TOKEN>
# TELEGRAM_CHAT_ID=<YOUR_CHAT_ID>
```

Important notes on Docker-specific paths:

- `TOKEN_STORE_PATH` must point to `/app/data/tokens.enc` (inside the container), not a host path.
- `SCHEDULER_DB_PATH` must point to `/app/data/scheduler.db`.
- Both paths are inside the mounted volume, so data persists across container restarts.

---

## Volume Mounting for Data Persistence

The server writes two files at runtime:

| File | Purpose | Default path in container |
|------|---------|---------------------------|
| `tokens.enc` | AES-256-GCM encrypted OAuth tokens | `/app/data/tokens.enc` |
| `scheduler.db` | SQLite database for scheduled posts | `/app/data/scheduler.db` |

### Named volume (recommended)

The `docker-compose.yml` above uses a named volume (`mcp-data`). Docker manages the storage location. Data survives `docker compose down` and `docker compose up` cycles.

To inspect the volume:

```bash
docker volume inspect linkedin-mcp_mcp-data
```

### Bind mount (alternative)

If you need direct access to the files on the host, replace the named volume with a bind mount:

```yaml
volumes:
  - ./data:/app/data
```

Make sure the `./data` directory exists on the host and has appropriate permissions:

```bash
mkdir -p data
chmod 700 data
```

### Backing up the volume

```bash
docker run --rm -v linkedin-mcp_mcp-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/mcp-data-backup.tar.gz -C /data .
```

### Restoring from backup

```bash
docker run --rm -v linkedin-mcp_mcp-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/mcp-data-backup.tar.gz -C /data
```

---

## SSE Transport Mode

Docker deployments use SSE (Server-Sent Events) transport instead of stdio. This is required because:

1. **stdio requires a direct pipe** between the MCP client (Claude Desktop) and the server process. Inside a container, there is no MCP client connected to stdin/stdout.
2. **SSE works over HTTP**, which means the container exposes a port and any MCP client on the network can connect to it.

### Connecting Claude Desktop to a Docker SSE server

In your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "linkedin": {
      "transport": "sse",
      "url": "http://localhost:3001/sse"
    }
  }
}
```

If the container runs on a remote host, replace `localhost` with the host's IP or domain name.

### Testing the SSE endpoint

```bash
curl -N http://localhost:3001/sse
```

Expected output (a stream of SSE events):

```text
event: open
data: {"protocolVersion":"2024-11-05"}
```

Press `Ctrl+C` to disconnect.

---

## Health Check Considerations

The default `docker-compose.yml` does not include a health check. To add one, extend the service definition:

```yaml
services:
  linkedin-mcp:
    # ... existing config ...
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3001/sse').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

This checks whether the SSE endpoint responds. If three consecutive checks fail, Docker marks the container as unhealthy.

To check health status:

```bash
docker compose ps
```

```text
NAME                           STATUS
linkedin-mcp-linkedin-mcp-1   Up 5 minutes (healthy)
```

---

## Production Checklist

Before deploying to a production or long-running environment, verify each item:

- [ ] `TOKEN_ENCRYPTION_KEY` is a unique, random string of at least 32 characters. Do not use the default value.
- [ ] `.env` file is not checked into version control. Confirm it is listed in `.gitignore`.
- [ ] The data volume is backed up on a schedule (see Backing up the volume above).
- [ ] `LOG_LEVEL` is set to `info` or `warn`. Avoid `debug` in production -- it increases log volume and may include sensitive request details.
- [ ] The container runs behind a reverse proxy (nginx, Caddy, Traefik) if exposed to the internet. The SSE endpoint has no built-in authentication.
- [ ] `LINKEDIN_REDIRECT_URI` matches the redirect URL configured in your LinkedIn developer app. If the container runs on a remote host, update both the env variable and the LinkedIn app settings to use the public URL.
- [ ] Rate limit values (`RATE_LIMIT_POSTS_PER_DAY`, `RATE_LIMIT_API_PER_MINUTE`) match your LinkedIn app's tier.
- [ ] The container has a restart policy (`restart: unless-stopped` or `restart: always`).
- [ ] Scheduled posts are tested by creating one with a time 10 minutes in the future and confirming it publishes.

---

## Rebuilding After Code Changes

After pulling new code or making local changes:

```bash
docker compose build --no-cache
docker compose up -d
```

The `--no-cache` flag forces a full rebuild. Without it, Docker may reuse cached layers that contain stale compiled output.

To verify the running version matches your expectations, check the startup log:

```bash
docker compose logs | head -5
```

---

## Key Takeaways

- The multi-stage Dockerfile produces a production image with no devDependencies or source code.
- Docker deployments must use SSE transport. Set `MCP_TRANSPORT=sse` and connect Claude Desktop to `http://<HOST>:3001/sse`.
- Persistent data (tokens, scheduler database) lives in a Docker volume mounted at `/app/data`.
- Always change `TOKEN_ENCRYPTION_KEY` from its default value before deploying.
- Add a health check and a reverse proxy for production use.

## Related Pages

- [Configuration](Configuration) -- Full list of environment variables and their defaults
- [Architecture](Architecture) -- How transport modes (stdio vs SSE) work internally
- [Troubleshooting](Troubleshooting) -- Fixing connection and authentication issues
- [Getting-Started](Getting-Started) -- Non-Docker installation options
