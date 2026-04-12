---
title: Tools Reference
sidebar_label: Tools Reference
sidebar_position: 10
audience: L2-L3
---

# Tools Reference

**TL;DR:** AmplifyrMCP exposes up to 20 tools: 15 always-available LinkedIn tools, 5 engagement tools (when Community Management API app is configured), and 2 Medium tools. This page documents every parameter, expected output, and edge case.

**Prerequisite knowledge:**

- The MCP server is installed and running (see [Getting Started](Getting-Started))
- LinkedIn OAuth credentials are configured (see [LinkedIn App Setup](LinkedIn-App-Setup))
- For engagement tools: Community Management API app configured (see [LinkedIn App Setup](LinkedIn-App-Setup))
- For Medium tools: `MEDIUM_INTEGRATION_TOKEN` is set (see [Medium Setup](Medium-Setup))

---

You do not call these tools directly. Claude invokes them based on your natural language requests. The parameter tables and examples below help you understand what each tool accepts and returns.

---

## LinkedIn — Content Creation

### 1. linkedin_authenticate

Starts the OAuth 2.0 authorization flow to connect your LinkedIn account (primary app).

**Parameters:** None

**Example prompts:**

```
Authenticate with LinkedIn
Connect my LinkedIn account
```

**Example output:**

```
Authenticated as Gurpreet Singh
URN: urn:li:person:abc123
```

**Notes:**

- If valid tokens already exist, the tool skips the browser flow and returns your cached profile info.
- Tokens last ~60 days. Refresh tokens extend this to ~1 year.
- The callback server runs on port 3456 and shuts down after receiving the response or a 30-second timeout.

---

### 2. linkedin_create_post

Creates a text post on your personal LinkedIn feed.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | -- | Post content (1-3000 characters) |
| `visibility` | string | No | `PUBLIC` | `PUBLIC` or `CONNECTIONS` |
| `hashtags` | string[] | No | -- | Hashtags without `#` prefix (max 30) |

**Example prompts:**

```
Post on LinkedIn: Excited to announce that v2.0 is live!
Create a LinkedIn post about AI in DevOps, add hashtags ai, devops, sre
Post to connections only: We are hiring. Message me.
```

**Example output:**

```
Post published!
URL: https://www.linkedin.com/feed/update/urn:li:share:12345/
URN: urn:li:share:12345
```

**Notes:**

- Hashtags are appended to the text separated by a blank line. The 3000 char limit includes hashtags.
- LinkedIn does not support markdown in posts — formatting is stripped to plain text.
- Hashtag items must not include the `#` symbol. Pass `["ai"]` not `["#ai"]`.

---

### 3. linkedin_create_post_with_image

Uploads an image and creates a post with it attached — all in one step.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | -- | Post content (1-3000 characters) |
| `image_path` | string | Yes | -- | Local file path to image (jpg/png/gif, max 8MB) |
| `visibility` | string | No | `PUBLIC` | `PUBLIC` or `CONNECTIONS` |
| `hashtags` | string[] | No | -- | Hashtags without `#` prefix (max 30) |

**Example prompts:**

```
Post on LinkedIn with image ~/Desktop/infographic.png: Check out our Q1 results!
Create a post with image ~/Photos/team.jpg about our hackathon, add hashtags hackathon, teamwork
```

**Example output:**

```
Post with image published!
URL: https://www.linkedin.com/feed/update/urn:li:share:12345/
URN: urn:li:share:12345
Image: urn:li:image:D4E10...
```

**Notes:**

- Internally handles the two-step upload (initialize → upload binary → create post).
- Supported formats: JPEG, PNG, GIF. Max 8MB.

---

### 4. linkedin_publish_article

Shares an article link as a rich post with title, description, and optional cover image.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | Yes | -- | Article title (max 200 characters) |
| `body` | string | Yes | -- | Description/summary text |
| `source_url` | string | Yes | -- | URL of the article (must be publicly accessible) |
| `cover_image_path` | string | No | -- | Local file path for cover image (jpg/png/gif, max 8MB) |
| `visibility` | string | No | `PUBLIC` | `PUBLIC` or `CONNECTIONS` |

**Example prompts:**

```
Share my article "Getting Started with MCP" from https://myblog.com/mcp-guide on LinkedIn
```

**Notes:**

- The `source_url` is required — LinkedIn's v2 API requires a URL for article posts.
- For long-form content without an external URL, use `linkedin_create_post` (up to 3000 chars) instead.

---

## LinkedIn — Post Management

### 5. linkedin_edit_post

Updates the text of an existing LinkedIn post.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `post_urn` | string | Yes | -- | The URN of the post to edit |
| `text` | string | Yes | -- | New post text (1-3000 characters) |

**Example prompts:**

```
Edit my post urn:li:share:12345 to say: Updated: We're now hiring for 3 roles.
```

---

### 6. linkedin_delete_post

Permanently removes a LinkedIn post.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `post_urn` | string | Yes | -- | The URN of the post to delete |

**Example prompts:**

```
Delete my LinkedIn post urn:li:share:12345
```

**Notes:** This cannot be undone.

---

### 7. linkedin_upload_media

Uploads an image to LinkedIn and returns an image URN for use in subsequent posts. Most users should use `linkedin_create_post_with_image` instead.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `file_path` | string | Yes | -- | Path to image file (supports absolute, relative, and `~`) |
| `alt_text` | string | No | -- | Alternative text for accessibility |

**Supported formats:** JPEG, PNG, GIF. Max 8MB.

---

## LinkedIn — Engagement (requires Community Management API app)

These 5 tools only appear when `LINKEDIN_COMMUNITY_CLIENT_ID` is configured. They use a separate LinkedIn developer app because LinkedIn requires the "Community Management API" product to be the only product on an app.

### 8. linkedin_authenticate_community

Authenticates with the Community Management API (separate OAuth flow on port 3457).

**Parameters:** None

**Example prompts:**

```
Authenticate with Community Management API
Connect the engagement tools
```

**Notes:**

- This is a separate auth flow from `linkedin_authenticate`. You need both.
- Uses port 3457 (not 3456) for the OAuth callback.
- Tokens are stored in `data/community-tokens.enc` (separate from primary tokens).

---

### 9. linkedin_get_post_stats

Fetches engagement metrics for a specific post.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `post_urn` | string | Yes | -- | The URN of the post |

**Example prompts:**

```
Show me stats for my post urn:li:share:12345
How is my last post performing?
```

**Example output:**

```
Post Stats for urn:li:share:12345
Likes: 42
Comments: 8
Shares: 5

Note: Impressions and clicks are only available for Company Page posts (Marketing API).
```

**Notes:**

- Uses `/socialActions/{urn}` endpoint (personal profile stats).
- Impressions and clicks are not available for personal posts — they require the Marketing API which is for Company Pages only.

---

### 10. linkedin_get_comments

Fetches comments on a post.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `post_urn` | string | Yes | -- | The URN of the post |
| `count` | number | No | 20 | Number of comments to fetch (1-100) |

**Example prompts:**

```
Show me comments on my post urn:li:share:12345
Get the last 50 comments on urn:li:share:12345
```

**Example output:**

```
Comments on urn:li:share:12345 (2)

1. [2026-04-10T08:15:00Z] urn:li:person:abc
   "Great post! Really insightful."
   URN: urn:li:comment:(urn:li:share:12345,456)

2. [2026-04-10T09:30:00Z] urn:li:person:def
   "Thanks for sharing!"
   URN: urn:li:comment:(urn:li:share:12345,789)
```

**Notes:** The comment URNs in the output are needed for `linkedin_reply_to_comment`.

---

### 11. linkedin_reply_to_comment

Replies to a specific comment on a post.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `post_urn` | string | Yes | -- | The URN of the post |
| `comment_urn` | string | Yes | -- | The URN of the parent comment to reply to |
| `text` | string | Yes | -- | Reply text (max 1250 characters) |

**Example prompts:**

```
Reply to comment urn:li:comment:(urn:li:share:12345,456) with "Thanks for reading!"
```

**Workflow:** First use `linkedin_get_comments` to see comments and their URNs, then reply.

---

### 12. linkedin_like_post

Likes a LinkedIn post.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `post_urn` | string | Yes | -- | The URN of the post to like |

**Example prompts:**

```
Like the post urn:li:share:12345
```

---

## LinkedIn — Analytics

### 13. linkedin_get_profile

Fetches your LinkedIn profile information.

**Parameters:** None

**Example prompts:**

```
Show my LinkedIn profile
What is my LinkedIn URN?
Am I still authenticated?
```

**Example output:**

```
Name: Gurpreet Singh
URN: urn:li:person:abc123
Picture: https://media.licdn.com/dms/image/...
```

---

### 14. linkedin_get_profile_stats

Fetches profile-level statistics.

**Parameters:** None

**Example prompts:**

```
How many LinkedIn followers do I have?
Show my profile stats
```

**Example output:**

```
Profile Stats
Followers: 4,832

Note: Profile views and search appearances require additional API permissions.
```

---

### 15. linkedin_search_posts

Searches your own LinkedIn posts by keyword or hashtag.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | -- | Search keyword or hashtag |
| `count` | number | No | 10 | Number of results (1-50) |

**Example prompts:**

```
Search my LinkedIn posts for "kubernetes"
Find my posts about AI
```

**Example output:**

```
Search results for "kubernetes" (2)

1. [2026-04-01] Kubernetes is becoming invisible...
   URN: urn:li:share:111

2. [2026-03-15] Our K8s migration taught me...
   URN: urn:li:share:222
```

**Notes:** Searches post text (commentary) only. Returns post URNs usable with other tools.

---

## LinkedIn — Scheduling

### 16. linkedin_schedule_post

Saves a post for future publication at a specified time.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | -- | Post content (1-3000 characters) |
| `scheduled_time` | string | Yes | -- | ISO 8601 datetime (at least 5 minutes in future) |
| `visibility` | string | No | `PUBLIC` | `PUBLIC` or `CONNECTIONS` |
| `hashtags` | string[] | No | -- | Hashtags without `#` prefix (max 30) |

**Example prompts:**

```
Schedule a LinkedIn post for tomorrow at 9am UTC: Big announcement coming!
Schedule a post for 2026-04-15T14:00:00Z about our launch with hashtags launch, startup
```

**How scheduling works:**

1. Post saved to SQLite database with status `PENDING`
2. Cron job runs every 60 seconds checking for due posts
3. On success: status → `PUBLISHED`, Telegram notification sent
4. On failure: retry up to 3 times, then status → `FAILED`

**Notes:**

- Time without timezone offset is interpreted as UTC. Include offset for other zones.
- The MCP server must be running for scheduled posts to publish.

---

### 17. linkedin_list_scheduled

Lists scheduled posts with their current status.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | _(all)_ | Filter: `PENDING`, `PUBLISHED`, or `FAILED` |

**Example prompts:**

```
Show my scheduled LinkedIn posts
List pending scheduled posts
Show failed scheduled posts
```

---

### 18. linkedin_cancel_scheduled

Cancels a pending scheduled post before publication.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `id` | string | Yes | -- | The ID of the scheduled post to cancel |

**Example prompts:**

```
Cancel scheduled post fc557a0f-2833-40a5-9805-a75a017a92c1
```

**Notes:** Use `linkedin_list_scheduled` first to find the post ID.

---

## Medium

### 19. medium_publish_article

Publishes an article to your Medium account. Available only when `MEDIUM_INTEGRATION_TOKEN` is configured.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | Yes | -- | Article title (max 200 characters) |
| `content` | string | Yes | -- | Article body in markdown or HTML |
| `content_format` | string | No | `markdown` | `markdown` or `html` |
| `tags` | string[] | No | -- | Up to 5 tags |
| `publish_status` | string | No | `draft` | `draft`, `public`, or `unlisted` |
| `canonical_url` | string | No | -- | Original URL if cross-posting |

**Notes:**

- Default status is `draft` — review on Medium before publishing.
- Medium keeps first 5 tags and drops the rest silently.
- Articles cannot be edited/deleted through the API after publication.

---

### 20. medium_get_profile

Fetches your Medium profile information. Available only when `MEDIUM_INTEGRATION_TOKEN` is configured.

**Parameters:** None

---

## Error Handling

All tools follow a consistent error pattern:

| Error | Cause | Resolution |
|-------|-------|------------|
| `AUTH_ERROR` | Not authenticated or tokens missing | Run `linkedin_authenticate` |
| `TOKEN_EXPIRED` | Access token expired and refresh failed | Run `linkedin_authenticate` |
| `RATE_LIMIT` | Too many requests | Wait and retry |
| `VALIDATION_ERROR` | Input fails schema validation | Check parameter constraints |
| `API_ERROR` | LinkedIn/Medium API error | Check status code; often transient |
| `INVALID_MEDIA` | File not found, wrong format, or too large | Verify file path, format, and size |
| `SCHEDULER_ERROR` | Database or scheduling issue | Check `data/` directory is writable |
| `PAST_DATE` | Scheduled time not far enough in future | Set to at least 5 minutes from now |

Transient errors (HTTP 429, 500, 502, 503, 504) are retried up to 3 times with exponential backoff. Permanent errors (400, 401, 403) are returned immediately.

---

## Related Pages

- [Getting Started](Getting-Started) -- installation and first run
- [LinkedIn App Setup](LinkedIn-App-Setup) -- obtaining LinkedIn OAuth credentials and enabling products
- [Medium Setup](Medium-Setup) -- obtaining a Medium integration token
- [Telegram Setup](Telegram-Setup) -- configuring push notifications
- [Configuration](Configuration) -- full environment variable reference
- [Architecture](Architecture) -- how the tools, services, and API client fit together
- [Troubleshooting](Troubleshooting) -- debugging common issues
