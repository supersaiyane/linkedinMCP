---
title: Installation
sidebar_label: Installation
sidebar_position: 2
audience: L1-L2
---

# Installation

**TL;DR:** Clone the repo, run `npm install && npm run build`, and verify with `node dist/index.js --help`. Alternatively, use Docker. The entire process takes under 5 minutes.

**Prerequisite knowledge:** Ability to run commands in a terminal. Familiarity with git clone and npm is helpful but not required -- every command is provided with expected output.

---

## System Requirements

| Requirement | Minimum Version | Check Command | Purpose |
|-------------|----------------|---------------|---------|
| Node.js | 20.0.0 | `node --version` | JavaScript runtime |
| npm | 10.0.0 | `npm --version` | Package manager (ships with Node.js) |
| git | 2.0.0 | `git --version` | Clone the repository |
| Claude Desktop | Latest | [Download page](https://claude.ai/download) | MCP client that connects to this server |

Optional requirements for specific features:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Docker | 20.0.0+ | Container-based installation (Method 2) |
| Docker Compose | 2.0.0+ | Simplified container orchestration |

### Verify your environment

Run all checks at once:

```bash
node --version && npm --version && git --version
```

Expected output (version numbers may be higher):

```
v20.18.0
10.8.2
git version 2.43.0
```

If `node` is not found or the version is below 20, install Node.js from [nodejs.org](https://nodejs.org/) (LTS version recommended).

---

## Method 1: Clone and Build (Recommended)

This is the standard installation for local development and Claude Desktop integration.

### Step 1: Clone the repository

```bash
git clone https://github.com/supersaiyane/AmplifyrMCP.git
cd AmplifyrMCP
```

Expected output:

```
Cloning into 'AmplifyrMCP'...
remote: Enumerating objects: ...
remote: Counting objects: 100% ...
Receiving objects: 100% ...
Resolving deltas: 100% ...
```

### Step 2: Install dependencies

```bash
npm install
```

Expected output (summary line at the end):

```
added 187 packages, and audited 188 packages in 12s
found 0 vulnerabilities
```

The exact package count may vary. Warnings about optional dependencies are safe to ignore. Vulnerabilities at the `info` or `low` level are generally non-blocking.

### Step 3: Build the project

```bash
npm run build
```

Expected output:

```
(no output on success)
```

TypeScript compiles silently on success. If you see errors, check that your Node.js version meets the minimum requirement.

### Step 4: Verify the build

```bash
ls dist/index.js
```

Expected output:

```
dist/index.js
```

If the file exists, the build succeeded. The compiled JavaScript in `dist/` is what Claude Desktop runs.

### Full verification

Run the type checker, linter, and test suite to confirm everything works:

```bash
npm run typecheck && npm run test
```

Expected output (final lines):

```
Test Files  XX passed
Tests       XX passed
```

---

## Method 2: Docker

Use Docker if you prefer container isolation or plan to run the server on a remote machine with SSE transport.

### Step 1: Build the image

```bash
docker build -t amplifyr-mcp .
```

Expected output (final lines):

```
 => exporting to image
 => => naming to docker.io/library/amplifyr-mcp
```

### Step 2: Create an environment file

```bash
cp .env.example .env
```

Edit `.env` and fill in your LinkedIn credentials (see [Quick-Start-Guide](Quick-Start-Guide) for details on obtaining these).

### Step 3: Run the container

For SSE transport (remote clients):

```bash
docker run --env-file .env -p 3001:3001 amplifyr-mcp
```

Expected output:

```
{"level":30,"time":"...","msg":"LinkedIn MCP server started","transport":"sse","port":3001}
```

For stdio transport (Claude Desktop), use docker-compose:

```bash
docker compose up
```

### Step 4: Verify the container

```bash
docker ps --filter name=amplifyr-mcp
```

Expected output:

```
CONTAINER ID   IMAGE                   STATUS         PORTS
abc123def456   amplifyr-mcp     Up 2 seconds   0.0.0.0:3001->3001/tcp
```

### Volume persistence

The Docker setup mounts `./data/` as a volume. This directory stores:

- `tokens.enc` -- Encrypted OAuth tokens (persists across container restarts)
- `scheduler.db` -- SQLite database for scheduled posts

If you remove the volume, you will need to re-authenticate with LinkedIn.

---

## Post-Installation

After installation, you need to:

1. Obtain LinkedIn API credentials -- see [LinkedIn-App-Setup](LinkedIn-App-Setup)
2. Configure the server -- see [Quick-Start-Guide](Quick-Start-Guide) for the minimal setup, or [Configuration](Configuration) for all options
3. Connect to Claude Desktop -- covered in [Quick-Start-Guide](Quick-Start-Guide) step 3

---

## Troubleshooting Installation

### `npm install` fails with permission errors

Do not run npm with `sudo`. If you see `EACCES` errors, fix your npm permissions:

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

Then retry `npm install`.

### `npm run build` shows TypeScript errors

Ensure you are using Node.js 20 or higher:

```bash
node --version
```

If the version is below 20, upgrade Node.js before building.

### `better-sqlite3` fails to compile

This native module requires a C++ compiler. On macOS, install Xcode command-line tools:

```bash
xcode-select --install
```

On Ubuntu/Debian:

```bash
sudo apt-get install build-essential python3
```

Then retry `npm install`.

---

## Key Takeaways

- Node.js 20+ and npm 10+ are the only hard requirements for local installation.
- `npm install && npm run build` produces the `dist/index.js` entry point that Claude Desktop launches.
- Docker is available for containerized deployments, primarily useful with SSE transport for remote access.
- The `data/` directory holds encrypted tokens and the scheduler database -- back it up if you want to preserve state.

## Related Pages

- [Quick-Start-Guide](Quick-Start-Guide) -- Continue setup: credentials, Claude Desktop config, first post
- [Configuration](Configuration) -- All environment variables explained
- [Docker-Deployment](Docker-Deployment) -- Advanced Docker and docker-compose configuration
- [Troubleshooting](Troubleshooting) -- More error scenarios and fixes
