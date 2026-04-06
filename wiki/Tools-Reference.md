---
title: Tools Reference
sidebar_label: Tools Reference
sidebar_position: 10
audience: L2-L3
---

# Tools Reference

**TL;DR:** The LinkedIn MCP server exposes 9 tools: 7 for LinkedIn (authenticate, post, article, media upload, profile, schedule, list scheduled) and 2 for Medium (publish article, profile). This page documents every parameter, expected output, and edge case for each tool.

**Prerequisite knowledge:**

- The MCP server is installed and running (see [Getting Started](Getting-Started))
- LinkedIn OAuth credentials are configured (see [LinkedIn App Setup](LinkedIn-App-Setup))
- For Medium tools: `MEDIUM_INTEGRATION_TOKEN` is set (see [Medium Setup](Medium-Setup))

---

You do not call these tools directly. Claude invokes them based on your natural language requests. The parameter tables and examples below help you understand what each tool accepts and returns.

---

## 1. linkedin_authenticate

Starts the OAuth 2.0 authorization flow to connect your LinkedIn account.

**Parameters:** None

**Example prompts:**

```
Authenticate with LinkedIn
```

```
Connect my LinkedIn account
```

```
Log in to LinkedIn
```

**Example output:**

```
Authenticated as Gurpreet Singh
URN: urn:li:person:abc123
```

**Notes and edge cases:**

- If valid tokens already exist, the tool skips the browser flow and returns your cached profile info.
- Tokens last approximately 60 days. Refresh tokens extend this to approximately 1 year. You should not need to re-authenticate frequently.
- If the browser does not open automatically, the tool returns the authorization URL as text. Copy it into your browser manually.
- The temporary callback server on port 3456 shuts down automatically after receiving the response or after a 30-second timeout.
- If port 3456 is already in use by another application, the callback server will fail to start. Free the port and retry.

---

## 2. linkedin_create_post

Creates a text post on your personal LinkedIn feed.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | -- | Post content. Minimum 1 character, maximum 3000 characters. |
| `visibility` | string | No | `PUBLIC` | Who can see the post. Accepts `PUBLIC` or `CONNECTIONS`. |
| `hashtags` | string[] | No | -- | Hashtags to append. Alphanumeric only, without the `#` prefix. Maximum 30 items. |

**Example prompts:**

```
Post on LinkedIn: Excited to announce that v2.0 of our API is live!
```

```
Create a LinkedIn post about the future of AI with hashtags ai, machinelearning, tech
```

```
Post to connections only: We are hiring a senior engineer. Message me if interested.
```

**Example output:**

```
Post published!
URL: https://www.linkedin.com/feed/update/urn:li:share:12345/
URN: urn:li:share:12345
```

**Notes and edge cases:**

- Hashtags are appended to the text, separated by a blank line. The 3000 character limit includes the appended hashtags.
- LinkedIn does not support markdown in posts. Bold, italic, links, and other formatting are stripped to plain text.
- The `hashtags` array items must not include the `#` symbol. Passing `["#ai"]` will fail validation; pass `["ai"]` instead.
- If the account is not authenticated, the tool returns an error directing you to call `linkedin_authenticate` first.

---

## 3. linkedin_publish_article

Shares an article link as a rich post with title, description, and optional cover image.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | Yes | -- | Article title. Maximum 200 characters. |
| `body` | string | Yes | -- | Description text or article summary. Displayed as commentary above the article card. |
| `source_url` | string | Yes | -- | URL of the article. Must be a valid, publicly accessible URL. |
| `cover_image_path` | string | No | -- | Local file path for a cover image (jpg, png, or gif, max 8MB). |
| `visibility` | string | No | `PUBLIC` | `PUBLIC` or `CONNECTIONS`. |

**Example prompts:**

```
Share my article "Getting Started with MCP" from https://myblog.com/mcp-guide on LinkedIn
```

```
Publish an article titled "AI in 2026" from https://example.com/ai-article with cover image ~/Desktop/cover.png
```

**Example output:**

```
Article published!
Title: Getting Started with MCP
URL: https://www.linkedin.com/feed/update/urn:li:share:12345/
```

**Notes and edge cases:**

- The `source_url` parameter is required. LinkedIn's v2 API requires a URL for article-type posts. There is no API endpoint for creating native LinkedIn articles (the old UGC Articles API was deprecated).
- If you want to post original long-form content without an external URL, use `linkedin_create_post` with up to 3000 characters of text instead.
- Cover images are uploaded through the two-step LinkedIn image upload process internally. The file must be a supported format (JPEG, PNG, GIF) and under 8MB.
- The `body` parameter is rendered as the post's commentary text. Keep it concise for better engagement.

---

## 4. linkedin_upload_media

Uploads an image to LinkedIn and returns an image URN for use in subsequent posts.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `file_path` | string | Yes | -- | Path to the image file. Supports absolute paths, relative paths, and `~` for home directory. |
| `alt_text` | string | No | -- | Alternative text for accessibility. |

**Supported formats:** JPEG (`.jpg`, `.jpeg`), PNG (`.png`), GIF (`.gif`). Maximum file size: 8MB.

**Example prompts:**

```
Upload ~/Desktop/screenshot.png to LinkedIn
```

```
Upload the image at /Users/me/photos/diagram.jpg to LinkedIn with alt text "System architecture diagram"
```

**Example output:**

```
Image uploaded!
URN: urn:li:image:D4E10AQH...
Use this URN when creating posts with images.
```

**Notes and edge cases:**

- The upload is a two-step process internally: the server first initializes the upload with LinkedIn (receiving an upload URL and image URN), then PUTs the binary data to that URL.
- The returned URN can be referenced in subsequent post or article creation, but the MCP server currently handles image attachment automatically when you provide a `cover_image_path` to `linkedin_publish_article`. This tool is useful for pre-uploading images or advanced workflows.
- File paths are resolved using `path.resolve()`. Both absolute and relative paths work. The `~` character is expanded to the user's home directory.
- If the file does not exist, the tool returns an error with the resolved path.
- If the file exceeds 8MB or is not a supported format, the tool returns a descriptive validation error.

---

## 5. linkedin_get_profile

Fetches your LinkedIn profile information from the authenticated account.

**Parameters:** None

**Example prompts:**

```
Show my LinkedIn profile
```

```
What is my LinkedIn URN?
```

```
Am I still authenticated with LinkedIn?
```

**Example output:**

```
Name: Gurpreet Singh
URN: urn:li:person:abc123
Picture: https://media.licdn.com/dms/image/...
```

**Notes and edge cases:**

- This tool doubles as a quick authentication check. If tokens have expired and cannot be refreshed, it returns an authentication error.
- The URN (`urn:li:person:...`) is the internal identifier used by all LinkedIn API operations. It is derived from the `sub` field of the `/v2/userinfo` endpoint.
- The profile picture URL may be `null` if the LinkedIn account does not have a profile photo.

---

## 6. linkedin_schedule_post

Saves a post for future publication at a specified time.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | -- | Post content. Same constraints as `linkedin_create_post` (1-3000 characters). |
| `scheduled_time` | string | Yes | -- | ISO 8601 datetime string. Must be at least 5 minutes in the future. |
| `visibility` | string | No | `PUBLIC` | `PUBLIC` or `CONNECTIONS`. |
| `hashtags` | string[] | No | -- | Hashtags without `#` prefix. Maximum 30 items. |

**Example prompts:**

```
Schedule a LinkedIn post for tomorrow at 9am UTC: Excited to announce our Series A!
```

```
Schedule a post for 2026-04-10T14:00:00Z about our product launch with hashtags launch, startup
```

```
Schedule this for next Monday at 8am EST: Weekly team update - we shipped 3 features this sprint.
```

**Example output:**

```
Post scheduled for 2026-04-10T14:00:00.000Z
ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**How scheduling works (L3):**

1. The post is saved to a local SQLite database with status `PENDING`.
2. A cron job runs every 60 seconds, checking for posts whose `scheduled_at` time has passed.
3. When a post is due, the scheduler sets its status to `PUBLISHING` and calls the LinkedIn API.
4. On success, the status changes to `PUBLISHED` and the result URL is stored.
5. On failure, the post is retried up to 3 times. After 3 failures, the status changes to `FAILED` and the error message is recorded.

**Notes and edge cases:**

- The `scheduled_time` must be at least 5 minutes in the future. Attempting to schedule in the past or within the next 5 minutes returns a `PAST_DATE` error.
- Scheduling relies on the machine's local clock. If the system clock is significantly wrong, posts may fire at unexpected times.
- The MCP server must be running for scheduled posts to publish. Claude Desktop keeps the server process alive while the application is open. If Claude Desktop is closed when a scheduled time passes, the post will be published the next time Claude Desktop is opened and the server starts.
- Time zones: if you provide a time without a timezone offset (e.g., `2026-04-10T14:00:00`), it is interpreted as UTC. Include an explicit offset (e.g., `2026-04-10T14:00:00-05:00`) for other time zones.

---

## 7. linkedin_list_scheduled

Lists scheduled posts and their current status.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | _(all statuses)_ | Filter by status: `PENDING`, `PUBLISHED`, or `FAILED`. |

**Example prompts:**

```
Show my scheduled LinkedIn posts
```

```
List pending scheduled posts
```

```
Show failed scheduled posts
```

```
What posts are queued up?
```

**Example output:**

```
Scheduled Posts:
1. [PENDING] 2026-04-10 14:00 UTC - "Excited to announce our Series A..."
2. [PUBLISHED] 2026-04-09 10:00 UTC - "Weekly update..." -> https://www.linkedin.com/feed/update/urn:li:share:12345/
3. [FAILED] 2026-04-08 09:00 UTC - "Draft post about..." (Error: Rate limit exceeded, 3 attempts)
```

**Notes and edge cases:**

- Posts are sorted by scheduled time, earliest first.
- Published posts include the LinkedIn URL.
- Failed posts include the error message and attempt count.
- If no posts match the filter (or no posts have been scheduled), the output indicates an empty result rather than an error.

---

## 8. medium_publish_article

Publishes an article to your Medium account. This tool is available only when `MEDIUM_INTEGRATION_TOKEN` is configured.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | Yes | -- | Article title. Maximum 200 characters. |
| `content` | string | Yes | -- | Article body in markdown or HTML. |
| `content_format` | string | No | `markdown` | Content format: `markdown` or `html`. |
| `tags` | string[] | No | -- | Up to 5 tags. Additional tags are silently dropped by Medium. |
| `publish_status` | string | No | `draft` | Publication status: `draft`, `public`, or `unlisted`. |
| `canonical_url` | string | No | -- | Original URL of the content if cross-posting. Tells search engines which version is authoritative. |

**Example prompts:**

```
Write a Medium article about building MCP servers and save it as a draft
```

```
Publish a public article on Medium titled "AI in 2026" with tags ai, technology, future
```

```
Cross-post my blog from https://myblog.com/mcp-guide to Medium with the canonical URL set. Use tags mcp, ai, tutorial.
```

**Example output:**

```
Medium article saved as draft!
Title: AI in 2026
URL: https://medium.com/@username/ai-in-2026-abc123def
Status: Saved as draft
```

**Notes and edge cases:**

- The default `publish_status` is `draft`. This is intentional: drafts let you review formatting, add images, and preview the article on Medium before it becomes public.
- Medium accepts a maximum of 5 tags. If more than 5 are provided, Medium keeps the first 5 and drops the rest without an error.
- Images within the content must be referenced by publicly accessible URL using markdown syntax (`![alt](https://...)`) or HTML `<img>` tags. Local file paths do not work through Medium's API.
- The `content_format` must match the actual format of the `content` string. Sending markdown content with `content_format` set to `html` (or vice versa) produces rendering errors in the published article.
- When `canonical_url` is set, Medium displays an "Originally published at" link at the bottom of the article. See [Medium Setup](Medium-Setup) for details on canonical URLs and SEO implications.
- Articles cannot be edited or deleted through the API after publication. Use Medium's web editor for post-publication changes.
- If Telegram notifications are configured, a notification is sent when the article is published.

---

## 9. medium_get_profile

Fetches your Medium profile information. This tool is available only when `MEDIUM_INTEGRATION_TOKEN` is configured.

**Parameters:** None

**Example prompts:**

```
Show my Medium profile
```

```
What is my Medium username?
```

**Example output:**

```
Medium Profile
Name: Gurpreet Singh
Username: @gurpreetsingh
Profile: https://medium.com/@gurpreetsingh
```

**Notes and edge cases:**

- This tool is useful for verifying that the Medium integration token is valid and correctly configured.
- The username returned includes the `@` prefix as displayed on Medium.
- If the token is invalid or expired, the tool returns a 401 error with instructions to generate a new token.

---

## Error Handling Across All Tools (L3)

All tools follow a consistent error pattern. When a tool fails, the response includes `isError: true` and a descriptive message. Common error types:

| Error | Cause | Resolution |
|-------|-------|------------|
| `AUTH_ERROR` | Not authenticated or tokens missing | Run `linkedin_authenticate` |
| `TOKEN_EXPIRED` | Access token expired and refresh failed | Run `linkedin_authenticate` to re-authorize |
| `RATE_LIMIT` | Too many requests within the time window | Wait the indicated number of seconds and retry |
| `VALIDATION_ERROR` | Input fails schema validation | Check parameter constraints in the tables above |
| `API_ERROR` | LinkedIn or Medium API returned an error | Check the status code and message; often a transient issue |
| `INVALID_MEDIA` | File not found, wrong format, or too large | Verify the file path, format, and size |
| `SCHEDULER_ERROR` | Database or scheduling issue | Check that the `data/` directory is writable |
| `PAST_DATE` | Scheduled time is not far enough in the future | Set `scheduled_time` to at least 5 minutes from now |

Transient errors (HTTP 429, 500, 502, 503, 504) are automatically retried up to 3 times with exponential backoff before being surfaced. Permanent errors (400, 401, 403) are returned immediately.

---

## Key Takeaways

- All 9 tools are invoked through natural language prompts to Claude; you do not call them by name.
- LinkedIn tools require OAuth authentication via `linkedin_authenticate` before first use.
- Medium tools appear only when `MEDIUM_INTEGRATION_TOKEN` is set in the environment.
- Input validation is enforced for all parameters (text length, file size, date constraints, format restrictions).
- Transient API errors are retried automatically; permanent errors are returned with actionable messages.

## Related Pages

- [Getting Started](Getting-Started) -- installation and first run
- [LinkedIn App Setup](LinkedIn-App-Setup) -- obtaining LinkedIn OAuth credentials
- [Medium Setup](Medium-Setup) -- obtaining a Medium integration token
- [Telegram Setup](Telegram-Setup) -- configuring push notifications
- [Configuration](Configuration) -- full environment variable reference
- [Architecture](Architecture) -- how the tools, services, and API client fit together
- [Troubleshooting](Troubleshooting) -- debugging common issues
