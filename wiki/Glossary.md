---
title: Glossary
sidebar_label: Glossary
sidebar_position: 15
audience: L1
---

# Glossary

Definitions for every technical term used across this wiki.

**TL;DR:** If you encounter an unfamiliar term anywhere in the documentation, look it up here. Each entry explains what it is, provides a one-line analogy, and describes why it matters in the context of this project.

**Prerequisite knowledge:** None. This page is the starting point for understanding terminology.

---

### MCP {#mcp}

**What it is:** Model Context Protocol. An open standard created by Anthropic that defines how AI models (like Claude) communicate with external tools and data sources through a structured JSON-RPC interface.

**Analogy:** MCP is to AI tools what USB is to computer peripherals -- a universal plug that lets any compatible tool connect without custom wiring.

**Why it matters here:** This entire server is an MCP server. It exposes LinkedIn, Medium, and Telegram operations as tools that Claude can call through the MCP protocol. Without MCP, Claude would have no way to interact with these APIs.

**See also:** [Architecture](Architecture), [JSON-RPC](#json-rpc), [stdio](#stdio), [SSE](#sse)

---

### OAuth 2.0 {#oauth-20}

**What it is:** An authorization framework that lets a third-party application access a user's resources on another service without ever seeing the user's password. The user grants permission through a browser-based consent screen, and the application receives tokens instead of credentials.

**Analogy:** OAuth is like giving a valet a special car key that can start the engine but cannot open the trunk -- limited access without handing over your full set of keys.

**Why it matters here:** The server uses OAuth 2.0 to connect to your LinkedIn account. You authorize the server through LinkedIn's consent screen, and it receives an access token and refresh token. Your LinkedIn password never touches the server.

**See also:** [Access Token](#access-token), [Refresh Token](#refresh-token), [Authentication](Authentication)

---

### Access Token {#access-token}

**What it is:** A short-lived credential (typically valid for 60 days with LinkedIn) that authorizes API requests on behalf of a user. It is sent as a Bearer token in the HTTP Authorization header with every API call.

**Analogy:** An access token is a day pass to a building -- it gets you through the door, but it expires and needs to be renewed.

**Why it matters here:** Every LinkedIn API call (posting, fetching profile data, uploading media) requires a valid access token. The server stores it encrypted on disk and automatically refreshes it when it expires.

**See also:** [OAuth 2.0](#oauth-20), [Refresh Token](#refresh-token), [AES-256-GCM](#aes-256-gcm)

---

### Refresh Token {#refresh-token}

**What it is:** A long-lived credential (typically valid for 365 days with LinkedIn) used to obtain a new access token after the current one expires. It is exchanged server-to-server and never sent to the LinkedIn API directly.

**Analogy:** A refresh token is a membership card that lets you get a new day pass each time your old one expires, without going through the full sign-up process again.

**Why it matters here:** When the access token expires after ~60 days, the server uses the refresh token to get a new one automatically. If the refresh token itself expires, the user must re-authenticate through the browser.

**See also:** [OAuth 2.0](#oauth-20), [Access Token](#access-token)

---

### URN {#urn}

**What it is:** Uniform Resource Name. A globally unique identifier in the format `urn:li:<type>:<id>`. LinkedIn uses URNs to identify people, posts, images, and other entities. Example: `urn:li:person:abc123`.

**Analogy:** A URN is a permanent serial number for a LinkedIn entity -- like an ISBN for a book, it never changes even if other details do.

**Why it matters here:** The server uses the person URN (derived from the `sub` field in the user profile) as the `author` field for every post. Image URNs are returned after upload and referenced when creating posts with images.

**See also:** [Tools-Reference](Tools-Reference)

---

### AES-256-GCM {#aes-256-gcm}

**What it is:** Advanced Encryption Standard with a 256-bit key in Galois/Counter Mode. A symmetric encryption algorithm that provides both confidentiality (data is unreadable without the key) and authenticity (tampered data is detected and rejected).

**Analogy:** AES-256-GCM is a lockbox that not only keeps the contents secret but also has a tamper-evident seal -- you know if someone tried to open it or modify the contents.

**Why it matters here:** OAuth tokens are stored on disk encrypted with AES-256-GCM. The encryption key comes from the `TOKEN_ENCRYPTION_KEY` environment variable. Even if someone accesses the token file, they cannot read the tokens without the key.

**See also:** [Configuration](Configuration), [Authentication](Authentication)

---

### Zod {#zod}

**What it is:** A TypeScript-first schema validation library. It defines the shape and constraints of data at runtime and infers TypeScript types from those definitions, keeping runtime validation and compile-time types in sync.

**Analogy:** Zod is a bouncer at the door -- it checks that incoming data matches the dress code (schema) before letting it into the club (your application logic).

**Why it matters here:** Zod validates tool inputs from Claude, LinkedIn API responses, environment variables, and stored tokens. It is the primary defense against malformed data at every trust boundary in the server.

**See also:** [Contributing](Contributing)

---

### Pino {#pino}

**What it is:** A high-performance structured logging library for Node.js. It outputs JSON-formatted log lines that are machine-parseable and human-readable.

**Analogy:** Pino is a stenographer that records everything in a structured format so you can search and filter the transcript later.

**Why it matters here:** The server uses Pino for all logging. In stdio mode, Pino is configured to write to stderr (file descriptor 2) because stdout is reserved for MCP JSON-RPC messages. Writing logs to stdout would corrupt the protocol stream.

**See also:** [Architecture](Architecture), [stdio](#stdio)

---

### SQLite {#sqlite}

**What it is:** A self-contained, serverless, zero-configuration relational database engine. The entire database is a single file on disk, accessed through synchronous function calls (via `better-sqlite3` in this project) with no separate server process.

**Analogy:** SQLite is a notebook you carry with you -- no internet connection or database server required, and the data is always right there in a file.

**Why it matters here:** The post scheduler stores its queue in a SQLite database (`scheduler.db`). Scheduled posts, their status, retry counts, and results are all tracked in a single table.

**See also:** [Architecture](Architecture), [Cron](#cron)

---

### Cron {#cron}

**What it is:** A time-based job scheduler. In this project, the `croner` library runs a function on a recurring schedule defined by a cron expression (e.g., `* * * * *` means every minute).

**Analogy:** Cron is an alarm clock that rings at regular intervals to remind the server to check if any scheduled posts are due.

**Why it matters here:** The post scheduler uses a cron job that fires every minute to poll the SQLite database for posts whose scheduled time has arrived. Posts in PENDING status with a `scheduled_at` in the past are published.

**See also:** [SQLite](#sqlite), [Tools-Reference](Tools-Reference)

---

### Rate Limiting {#rate-limiting}

**What it is:** Restricting the number of requests a client can make within a time window. Prevents overloading an API and avoids being blocked by the upstream service.

**Analogy:** Rate limiting is a speed limit on a highway -- you can still drive, but exceeding the limit gets you pulled over (HTTP 429).

**Why it matters here:** The server enforces two rate limit buckets: posts per day and API calls per minute. These are checked before every LinkedIn API call. LinkedIn also enforces its own server-side rate limits and returns HTTP 429 when exceeded.

**See also:** [Sliding Window](#sliding-window), [Configuration](Configuration)

---

### Sliding Window {#sliding-window}

**What it is:** A rate-limiting algorithm that tracks request timestamps in a rolling time window. Unlike fixed windows (which reset at boundaries), sliding windows count requests within the last N seconds/minutes, avoiding burst patterns at window edges.

**Analogy:** A sliding window is like counting cars that passed a checkpoint in the last 60 seconds, rather than resetting the count every minute on the dot.

**Why it matters here:** The rate limiter uses a sliding window to track LinkedIn API usage. It stores an array of timestamps and filters out entries older than the window, providing accurate request counts without artificial reset boundaries.

**See also:** [Rate Limiting](#rate-limiting)

---

### stdio {#stdio}

**What it is:** Standard input/output. A communication method where two processes exchange data through stdin (input stream) and stdout (output stream). In MCP, the client (Claude Desktop) writes JSON-RPC messages to the server's stdin and reads responses from its stdout.

**Analogy:** stdio is like two people passing notes back and forth through a mail slot in a door -- one slot for sending, one for receiving.

**Why it matters here:** stdio is the default transport for local Claude Desktop integration. The server reads MCP requests from stdin and writes responses to stdout. All log output must go to stderr to avoid corrupting this stream.

**See also:** [SSE](#sse), [JSON-RPC](#json-rpc), [Pino](#pino)

---

### SSE {#sse}

**What it is:** Server-Sent Events. A standard for pushing real-time updates from a server to a client over a persistent HTTP connection. Unlike WebSockets, SSE is unidirectional (server to client) and works over standard HTTP.

**Analogy:** SSE is a live news ticker -- the server pushes updates to the client, and the client listens without needing to keep asking for new data.

**Why it matters here:** SSE is the alternative transport for remote or Docker deployments. The server starts an HTTP endpoint on a configurable port, and MCP clients connect over the network instead of through stdin/stdout.

**See also:** [stdio](#stdio), [Docker-Deployment](Docker-Deployment)

---

### JSON-RPC {#json-rpc}

**What it is:** JSON Remote Procedure Call. A lightweight protocol for calling functions on a remote server using JSON-formatted request and response messages. Each message has an `id`, a `method` name, and `params`.

**Analogy:** JSON-RPC is like filling out a form to request a specific service -- you write which service you want and what information to provide, and you get a form back with the result.

**Why it matters here:** MCP uses JSON-RPC as its wire protocol. When Claude calls a tool like `linkedin_create_post`, the MCP SDK serializes the call as a JSON-RPC request, sends it to the server, and deserializes the response. The SDK handles all of this; tool authors do not write JSON-RPC directly.

**See also:** [MCP](#mcp), [stdio](#stdio), [SSE](#sse)

---

### Axios {#axios}

**What it is:** A promise-based HTTP client for Node.js and browsers. It supports interceptors (middleware that runs before/after every request), automatic JSON parsing, and request/response transformation.

**Analogy:** Axios is a delivery service with a built-in quality control department -- packages (requests) go through inspection (interceptors) on the way out and on the way back.

**Why it matters here:** The LinkedIn API client uses Axios for all HTTP communication with LinkedIn. Interceptors handle automatic bearer token injection, retry logic for transient errors (429, 5xx), and response validation.

**See also:** [Architecture](Architecture)

---

### MSW {#msw}

**What it is:** Mock Service Worker. A testing library that intercepts HTTP requests at the network level using a service worker (browser) or request interception (Node.js). Tests run against real application code while MSW simulates the external APIs.

**Analogy:** MSW is a stunt double for external APIs -- your code thinks it is talking to LinkedIn, but MSW is the one responding behind the scenes.

**Why it matters here:** All tests use MSW to simulate LinkedIn API responses. This avoids mocking internal modules (which hides bugs) and avoids making real HTTP calls (which is slow and unreliable in CI). MSW intercepts outbound requests and returns predefined responses.

**See also:** [Vitest](#vitest), [Contributing](Contributing)

---

### Vitest {#vitest}

**What it is:** A fast unit testing framework for JavaScript and TypeScript projects. It is compatible with the Jest API, supports ESM natively, and integrates with Vite for fast test execution.

**Analogy:** Vitest is the quality assurance inspector who runs every check on the assembly line before the product ships.

**Why it matters here:** Vitest runs all unit and integration tests for the server. It is configured in `vitest.config.ts` and invoked through `npm test` or `make check`.

**See also:** [MSW](#msw), [Contributing](Contributing)

---

### MkDocs {#mkdocs}

**What it is:** A static site generator designed for building project documentation from Markdown files. Combined with the Material for MkDocs theme, it produces a searchable, navigable documentation site.

**Analogy:** MkDocs is a printing press that turns a folder of Markdown files into a polished, indexed reference book.

**Why it matters here:** This wiki is structured as MkDocs-compatible Markdown. Each page has frontmatter (`title`, `sidebar_label`, `sidebar_position`) that MkDocs uses to build navigation. Internal links use bare filenames without the `.md` extension.

**See also:** [Home](Home)

---

### Canonical URL {#canonical-url}

**What it is:** An HTML `<link rel="canonical">` tag that tells search engines which URL is the original source of a piece of content. When the same content appears at multiple URLs, the canonical URL prevents duplicate content penalties in search rankings.

**Analogy:** A canonical URL is a birth certificate for a web page -- it proves which version is the original, no matter how many copies exist.

**Why it matters here:** When cross-posting blog content to Medium, setting the canonical URL to the original blog post tells search engines that the blog is the primary source. Without it, Medium's higher domain authority could outrank your own site.

**See also:** [Medium-Setup](Medium-Setup)

---

### Integration Token {#integration-token}

**What it is:** A long-lived API key issued by Medium that grants programmatic access to a user's Medium account. It is generated from the Medium settings page and does not expire until revoked.

**Analogy:** An integration token is a backstage pass that lets the server post to Medium on your behalf without going through a login screen each time.

**Why it matters here:** The server uses a Medium integration token (set via `MEDIUM_INTEGRATION_TOKEN`) to publish articles. Unlike LinkedIn's OAuth flow, Medium uses a static token with no refresh cycle.

**See also:** [Medium-Setup](Medium-Setup), [Configuration](Configuration)

---

### Bot Token {#bot-token}

**What it is:** A unique authentication string issued by Telegram's BotFather when you create a Telegram bot. It grants full control over the bot: sending messages, receiving updates, and managing settings.

**Analogy:** A bot token is the remote control for your Telegram bot -- whoever holds it can make the bot do anything.

**Why it matters here:** The server uses the bot token (set via `TELEGRAM_BOT_TOKEN`) to send notifications through Telegram when posts are published, fail, or when authentication events occur.

**See also:** [Telegram-Setup](Telegram-Setup), [Chat ID](#chat-id)

---

### Chat ID {#chat-id}

**What it is:** A numeric identifier for a Telegram conversation (private chat, group, or channel). The bot needs this ID to know where to send messages.

**Analogy:** A chat ID is a mailing address -- the bot knows what to say, and the chat ID tells it where to deliver the message.

**Why it matters here:** Set via `TELEGRAM_CHAT_ID`, this tells the notification service which Telegram conversation receives status updates. You obtain it by messaging your bot and reading the chat ID from the Telegram Bot API.

**See also:** [Telegram-Setup](Telegram-Setup), [Bot Token](#bot-token)

---

### CSRF {#csrf}

**What it is:** Cross-Site Request Forgery. An attack where a malicious website tricks a user's browser into making an unwanted request to a site where the user is authenticated, exploiting the browser's automatic cookie inclusion.

**Analogy:** CSRF is like someone forging your signature on a check while you are logged into your bank -- the bank thinks the request is legitimate because your session cookie is attached.

**Why it matters here:** The OAuth callback server validates a `state` parameter to prevent CSRF attacks during the LinkedIn authorization flow. The state value is generated randomly before the flow starts and verified when the callback arrives. A mismatched state causes the authentication to fail.

**See also:** [OAuth 2.0](#oauth-20), [Authentication](Authentication)

---

### Webhook {#webhook}

**What it is:** A mechanism where a server sends an HTTP POST request to a pre-configured URL when a specific event occurs. The receiving server processes the event without polling.

**Analogy:** A webhook is a doorbell -- instead of checking the door every five seconds, you wait for the bell to ring and then answer.

**Why it matters here:** LinkedIn's OAuth redirect is a form of webhook: after the user authorizes, LinkedIn sends a GET request to the callback URL with the authorization code. The callback server handles this incoming request to complete the token exchange.

**See also:** [OAuth 2.0](#oauth-20), [Architecture](Architecture)

---

## Key Takeaways

- This glossary covers every technical term referenced in the wiki. Use the anchor links (e.g., `Glossary#mcp`) to link directly from other pages.
- Terms are grouped by relevance: authentication (OAuth, tokens, CSRF), infrastructure (MCP, JSON-RPC, transports), data (Zod, SQLite, URN), and tooling (Vitest, MSW, Pino).
- Each definition includes an analogy and product-specific context to connect abstract concepts to how they work in this server.

## Related Pages

- [Architecture](Architecture) -- How these components fit together
- [Authentication](Authentication) -- Deep dive into the OAuth 2.0 flow
- [Configuration](Configuration) -- Environment variables that reference these concepts
- [Contributing](Contributing) -- Development setup and testing tools mentioned here
