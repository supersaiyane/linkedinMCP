# Tools Reference

Complete reference for all 9 MCP tools exposed by the LinkedIn MCP server. You don't call these directly -- Claude calls them based on your natural language requests.

---

## linkedin_authenticate

Starts the OAuth 2.0 authorization flow to connect your LinkedIn account.

**Parameters:** None

**What happens:**
1. Checks if you already have valid tokens -- if yes, returns your profile info
2. Generates a LinkedIn authorization URL
3. Opens your browser to the LinkedIn login page
4. Starts a temporary callback server on port 3456
5. After you authorize, LinkedIn redirects back with an auth code
6. Exchanges the code for access + refresh tokens
7. Encrypts and stores tokens on disk
8. Returns your profile info

**Example prompts:**
```
Authenticate with LinkedIn
Connect my LinkedIn account
Log in to LinkedIn
```

**Output on success:**
```
Authenticated as Gurpreet Singh
URN: urn:li:person:abc123
```

**Notes:**
- You only need to do this once. Tokens last ~60 days and auto-refresh for ~1 year.
- If the browser doesn't open automatically, the auth URL is returned as text -- copy and paste it.
- The callback server shuts down automatically after receiving the response (30s timeout).

---

## linkedin_create_post

Creates a text post on your personal LinkedIn feed.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | -- | Post content (1-3000 characters) |
| `visibility` | string | No | `PUBLIC` | `PUBLIC` or `CONNECTIONS` |
| `hashtags` | string[] | No | -- | Hashtags without `#` prefix (max 30) |

**Example prompts:**
```
Post on LinkedIn: Just shipped v2.0 of our API!

Create a LinkedIn post about the future of AI with hashtags ai, machinelearning, tech

Post to connections only: We're hiring a senior engineer. DM me if interested.

Write a LinkedIn post about my experience at the tech conference. Make it engaging with a hook and call to action.
```

**Output on success:**
```
Post published successfully!
URL: https://www.linkedin.com/feed/update/urn:li:share:12345/
URN: urn:li:share:12345
```

**Notes:**
- Hashtags are appended to the text automatically, separated by a blank line
- LinkedIn doesn't support markdown -- bold, links, etc. are stripped to plain text
- The 3000 character limit includes hashtags

---

## linkedin_publish_article

Shares an article link as a rich post with title, description, and optional cover image.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | Yes | -- | Article title (max 200 characters) |
| `body` | string | Yes | -- | Description text or article summary |
| `source_url` | string | Yes | -- | URL of the article |
| `cover_image_path` | string | No | -- | Local file path for cover image |
| `visibility` | string | No | `PUBLIC` | `PUBLIC` or `CONNECTIONS` |

**Example prompts:**
```
Share my article "Getting Started with MCP" from https://myblog.com/mcp-guide

Publish an article titled "AI in 2026" from https://example.com/ai with cover image ~/Desktop/cover.png

Post this article link on LinkedIn with a summary: https://myblog.com/post
```

**Output on success:**
```
Article published!
Title: Getting Started with MCP
URL: https://www.linkedin.com/feed/update/urn:li:share:12345/
```

**Notes:**
- The `source_url` is required -- LinkedIn's API needs a URL for article posts
- If you want to post original content without an external URL, use `linkedin_create_post` with long text instead
- Cover images must be jpg, png, or gif (max 8MB)

---

## linkedin_upload_media

Uploads an image to LinkedIn and returns an image URN for use in posts.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `file_path` | string | Yes | -- | Path to image file |
| `alt_text` | string | No | -- | Alt text for accessibility |

**Supported formats:** JPEG, PNG, GIF (max 8MB)

**Example prompts:**
```
Upload ~/Desktop/screenshot.png to LinkedIn

Upload this image for LinkedIn: /Users/me/photos/diagram.jpg
```

**Output on success:**
```
Image uploaded!
URN: urn:li:image:D4E10AQH...
Use this URN when creating posts with images.
```

**Notes:**
- The upload is a two-step process internally: initialize upload (get URL), then PUT the binary
- The returned URN can be referenced when creating posts
- File paths support `~` for home directory and both absolute and relative paths

---

## linkedin_get_profile

Fetches your LinkedIn profile information.

**Parameters:** None

**Example prompts:**
```
Show my LinkedIn profile
What's my LinkedIn URN?
Am I still authenticated with LinkedIn?
```

**Output on success:**
```
Name: Gurpreet Singh
URN: urn:li:person:abc123
Picture: https://media.licdn.com/...
```

**Notes:**
- Also useful as a quick check that authentication is still working
- The URN is used internally for all API calls (posting, uploading, etc.)

---

## linkedin_schedule_post

Schedules a post for future publication.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | -- | Post content (1-3000 characters) |
| `scheduled_time` | string | Yes | -- | ISO 8601 datetime (must be 5+ minutes in the future) |
| `visibility` | string | No | `PUBLIC` | `PUBLIC` or `CONNECTIONS` |
| `hashtags` | string[] | No | -- | Hashtags without `#` prefix |

**Example prompts:**
```
Schedule a LinkedIn post for tomorrow at 9am: Excited to announce our Series A!

Schedule a post for 2026-04-10T14:00:00Z about our product launch with hashtags launch, startup

Schedule this for next Monday at 8am EST: Weekly team update - we shipped 3 features this sprint.
```

**Output on success:**
```
Post scheduled for 2026-04-10T14:00:00.000Z
ID: a1b2c3d4-...
```

**How scheduling works:**
1. Your post is saved to a local SQLite database with status `PENDING`
2. A cron job checks every minute for posts that are due
3. When the scheduled time arrives, the server publishes the post
4. On failure, it retries up to 3 times before marking as `FAILED`

**Notes:**
- The scheduled time must be at least 5 minutes in the future
- Scheduling uses your machine's clock -- make sure it's accurate
- The server must be running for scheduled posts to publish (Claude Desktop keeps it alive while open)
- If Claude Desktop is closed when a scheduled time passes, the post will publish the next time you open it

---

## linkedin_list_scheduled

Lists your scheduled posts with their current status.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | _(all)_ | Filter: `PENDING`, `PUBLISHED`, or `FAILED` |

**Example prompts:**
```
Show my scheduled LinkedIn posts
List pending scheduled posts
Show failed scheduled posts
What posts are queued up?
```

**Output on success:**
```
Scheduled Posts:
1. [PENDING] 2026-04-10 14:00 - "Excited to announce..."
2. [PUBLISHED] 2026-04-09 10:00 - "Weekly update..." -> https://linkedin.com/...
3. [FAILED] 2026-04-08 09:00 - "Draft post..." (Error: Rate limit exceeded)
```

**Notes:**
- Posts are sorted by scheduled time (earliest first)
- Published posts include the LinkedIn URL
- Failed posts include the error message

---

## medium_publish_article

Publishes an article to your Medium account. Only available when `MEDIUM_INTEGRATION_TOKEN` is configured.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | Yes | -- | Article title (max 200 characters) |
| `content` | string | Yes | -- | Article body (markdown or HTML) |
| `content_format` | string | No | `markdown` | `markdown` or `html` |
| `tags` | string[] | No | -- | Up to 5 tags |
| `publish_status` | string | No | `draft` | `public`, `draft`, or `unlisted` |
| `canonical_url` | string | No | -- | Original URL if cross-posting |

**Example prompts:**
```
Write a Medium article about building MCP servers and save it as a draft

Publish a public article on Medium titled "AI in 2026" with tags ai, technology

Cross-post my blog from https://myblog.com/post to Medium with the canonical URL set
```

**Output on success:**
```
Medium article saved as draft!

AI in 2026
https://medium.com/@username/ai-in-2026-abc123
Status: Saved as draft
```

**Notes:**
- Default status is `draft` -- review on Medium before publishing
- Medium allows max 5 tags per article
- Use `canonical_url` when cross-posting to avoid SEO penalties
- Markdown and HTML are supported; plain text is not
- Images must be URLs (not local files) -- use markdown `![alt](url)` syntax
- If Telegram notifications are configured, you'll get a notification when published

---

## medium_get_profile

Fetches your Medium profile information. Only available when `MEDIUM_INTEGRATION_TOKEN` is configured.

**Parameters:** None

**Example prompts:**
```
Show my Medium profile
What's my Medium username?
```

**Output on success:**
```
Medium Profile

Name: Gurpreet Singh
Username: @gurpreetsingh
Profile: https://medium.com/@gurpreetsingh
```
