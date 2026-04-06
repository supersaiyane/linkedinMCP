---
title: Concepts
sidebar_label: Concepts
sidebar_position: 1
audience: L1-L3
---

# Concepts

**TL;DR:** The AmplifyrMCP acts as a bridge between Claude Desktop and external services (LinkedIn, Medium, Telegram). It uses the Model Context Protocol to expose tools that Claude can call on your behalf, handling OAuth authentication, content formatting, rate limiting, and post scheduling behind the scenes.

**Prerequisite knowledge:** Basic familiarity with using Claude Desktop. No programming experience required.

---

## What is MCP?

MCP stands for Model Context Protocol. It is an open standard that lets AI assistants like Claude interact with external tools and services in a structured way.

Think of MCP like a USB port for AI assistants. A USB port provides a standard interface: any device that speaks USB can plug in and work. MCP does the same thing for AI tools. Any server that speaks MCP can plug into Claude Desktop, and Claude gains new capabilities without needing to know the implementation details.

Without MCP, Claude has no way to reach LinkedIn. With this MCP server running, Claude can create posts, upload images, and manage your LinkedIn presence through the same chat interface you already use.

### How MCP communication works

```
+------------------+          JSON-RPC           +-------------------+
|  Claude Desktop  | <=========================> |  MCP Server       |
|  (MCP Client)    |     over stdio pipe         |  (this project)   |
+------------------+                             +-------------------+
                                                        |
                                                        | HTTPS
                                                        v
                                                  External APIs
                                                  (LinkedIn, Medium,
                                                   Telegram)
```

1. Claude Desktop launches the MCP server as a child process.
2. They communicate over stdin/stdout using JSON-RPC messages.
3. The server advertises a list of tools it supports (e.g., `linkedin_create_post`).
4. When you ask Claude to do something LinkedIn-related, Claude picks the appropriate tool and sends a JSON-RPC request.
5. The server executes the tool -- calling the LinkedIn API, handling errors, formatting results -- and returns a response.
6. Claude presents the result to you in natural language.

---

## What Does This Server Do?

This server provides nine tools that Claude can call:

| Tool | Service | Purpose |
|------|---------|---------|
| `linkedin_authenticate` | LinkedIn | Connect your LinkedIn account via OAuth |
| `linkedin_create_post` | LinkedIn | Publish a text post with optional hashtags |
| `linkedin_publish_article` | LinkedIn | Share an article with title and cover image |
| `linkedin_upload_media` | LinkedIn | Upload an image for use in posts |
| `linkedin_get_profile` | LinkedIn | Retrieve your LinkedIn profile data |
| `linkedin_schedule_post` | LinkedIn | Queue a post for future publication |
| `linkedin_list_scheduled` | LinkedIn | View and manage scheduled posts |
| `medium_publish_article` | Medium | Publish an article on Medium |
| `telegram_send_message` | Telegram | Send a notification message |

LinkedIn is the primary integration. Medium and Telegram are optional add-ons that extend the server's capabilities.

---

## Core Concepts

### OAuth 2.0

OAuth 2.0 is the authorization standard that LinkedIn uses to grant third-party applications (like this server) access to your account.

**Analogy:** Imagine you want a house-sitter to water your plants while you are away. Instead of giving them your house key (your password), you give them a temporary access card that only opens the front door and expires after a week. OAuth works the same way: LinkedIn gives this server a temporary token that can post on your behalf, without ever seeing your password.

The OAuth flow works in four steps:

1. The server generates a LinkedIn authorization URL.
2. Your browser opens to that URL, where you log in to LinkedIn.
3. You click "Allow" to grant the server permission to post on your behalf.
4. LinkedIn sends a temporary code back to the server, which exchanges it for access tokens.

The access token lasts approximately 60 days. The refresh token lasts approximately 365 days. The server automatically refreshes expired access tokens using the refresh token, so you should not need to re-authenticate for about a year.

### MCP Tools

An MCP tool is a discrete operation that the server advertises to Claude. Each tool has:

- A **name** (e.g., `linkedin_create_post`)
- A **description** that tells Claude when to use it
- An **input schema** that defines what parameters it accepts
- A **handler** that executes the operation and returns a result

You never call tools directly. Claude reads your natural language request, decides which tool fits, fills in the parameters, and calls the tool through the MCP protocol.

### Token Encryption

When you authenticate with LinkedIn, the server receives access and refresh tokens. These tokens grant full posting access to your LinkedIn account, so they must be stored securely.

The server encrypts tokens using AES-256-GCM (the same encryption standard used by banks and governments) before writing them to disk. The encryption key comes from your `TOKEN_ENCRYPTION_KEY` environment variable. Without that key, the token file is unreadable.

The encrypted token file is stored at `./data/tokens.enc` by default. File permissions are set to owner-only read/write (mode 0600).

### Post Scheduling

The scheduler lets you queue posts for future publication. It uses a local SQLite database to store scheduled posts and a cron job that checks every minute for posts whose scheduled time has arrived.

The scheduling flow:

1. You tell Claude to schedule a post for a specific date and time.
2. The server validates the time is at least 5 minutes in the future.
3. The post is saved to the SQLite database with status `PENDING`.
4. The cron job picks it up at the scheduled time and publishes it.
5. If publication fails, the scheduler retries up to 3 times before marking it `FAILED`.

### Rate Limiting

LinkedIn enforces API rate limits. If you exceed them, your requests fail with HTTP 429 errors. This server implements client-side rate limiting to prevent you from hitting those limits:

- **Posts:** Maximum 100 per day (24-hour sliding window)
- **API calls:** Maximum 150 per minute (60-second sliding window)

The rate limiter runs in memory and resets when the server restarts. It acts as a safety net -- LinkedIn's server-side limits are the ultimate authority.

---

## How Concepts Relate

```
+---------------------------+
|     Claude Desktop        |
|  (you type requests here) |
+-----------+---------------+
            |
            | MCP Protocol (JSON-RPC)
            v
+-----------+---------------+
|     MCP Server Layer      |
|  (tool registration,      |
|   protocol handling)      |
+-----------+---------------+
            |
            v
+-----------+---------------+
|     Tool Handlers         |    <-- Each tool validates input with Zod schemas
|  (9 tools registered)     |
+-----------+---------------+
            |
     +------+------+
     |      |      |
     v      v      v
+--------+ +----+ +----------+
| Auth   | |Rate| |Scheduler |  <-- Auth manages OAuth tokens
|Manager | |Lim.| |(SQLite)  |  <-- Rate Limiter prevents API overuse
+---+----+ +--+-+ +----+-----+  <-- Scheduler queues future posts
    |         |        |
    v         v        v
+-----------+---------------+
|     API Clients           |    <-- HTTP calls with retry logic
|  (LinkedIn, Medium,       |
|   Telegram)               |
+-----------+---------------+
            |
            | HTTPS
            v
+-----------+---------------+
|   External Services       |
|  LinkedIn / Medium /      |
|  Telegram                 |
+---------------------------+
```

Data flows top to bottom for requests and bottom to top for responses. The Auth Manager injects tokens into every API call. The Rate Limiter checks limits before every API call. The Scheduler operates independently on a timer, using the same API client to publish posts when their scheduled time arrives.

---

## Key Takeaways

- MCP is a standard protocol that lets Claude Desktop use external tools -- like a USB port for AI capabilities.
- This server provides 9 tools spanning LinkedIn, Medium, and Telegram.
- OAuth 2.0 grants the server temporary, scoped access to your LinkedIn account without exposing your password.
- Tokens are encrypted at rest with AES-256-GCM. The encryption key never leaves your machine.
- The scheduler uses a local SQLite database and a per-minute cron job to publish posts at specified times.
- Rate limiting prevents you from exceeding LinkedIn's API quotas.

## Related Pages

- [Installation](Installation) -- Set up the server on your machine
- [Quick-Start-Guide](Quick-Start-Guide) -- Go from zero to first post in 5 minutes
- [Architecture](Architecture) -- Deeper technical details on each component
- [Authentication](Authentication) -- Full OAuth 2.0 flow walkthrough
- [Glossary](Glossary) -- Definitions for terms used in this page
