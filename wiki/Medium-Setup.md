# Medium Integration Setup

Publish articles to Medium directly from Claude Desktop. Supports markdown and HTML, tags, draft/public/unlisted modes, and cross-posting with canonical URLs.

**Time to set up:** 1 minute

## Step 1: Get a Medium Integration Token

1. Go to [medium.com/me/settings/security](https://medium.com/me/settings/security)
2. Scroll to **"Integration tokens"**
3. Enter a description (e.g., "LinkedIn MCP Server")
4. Click **"Get integration token"**
5. Copy the token

## Step 2: Configure

Add to your `.env` file:

```bash
MEDIUM_INTEGRATION_TOKEN=your_token_here
```

Or in Claude Desktop config:

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/path/to/linkedinMCP/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "...",
        "LINKEDIN_CLIENT_SECRET": "...",
        "MEDIUM_INTEGRATION_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Step 3: Restart Claude Desktop

Quit and reopen. Two new tools will appear: `medium_publish_article` and `medium_get_profile`.

## Available Tools

### medium_publish_article

Publishes an article to your Medium account.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | Yes | -- | Article title (max 200 chars) |
| `content` | string | Yes | -- | Article body |
| `content_format` | string | No | `markdown` | `markdown` or `html` |
| `tags` | string[] | No | -- | Up to 5 tags |
| `publish_status` | string | No | `draft` | `public`, `draft`, or `unlisted` |
| `canonical_url` | string | No | -- | Original URL if cross-posting |

**Example prompts:**

```
Write a Medium article about building MCP servers and save it as a draft
```

```
Publish a public Medium article titled "AI in 2026" with tags ai, technology, future
```

```
Cross-post my blog from https://myblog.com/post to Medium as unlisted with the canonical URL set
```

### medium_get_profile

Shows your Medium username and profile URL. No parameters.

```
Show my Medium profile
```

## Publish Statuses

| Status | What Happens |
|--------|-------------|
| `draft` (default) | Saved to your drafts. You can review and publish from Medium. |
| `public` | Published immediately to your Medium profile. |
| `unlisted` | Published but not shown in your profile or Medium feeds. Only accessible via direct link. |

**Recommendation:** Use `draft` by default. Review on Medium, then publish manually. This gives you a chance to add images, format sections, and preview before it goes live.

## Cross-Posting with Canonical URLs

If you're republishing content from your blog, always set the `canonical_url` to your original post URL. This tells search engines which version is the original, preventing SEO penalties for duplicate content.

```
Publish my blog post from https://myblog.com/my-guide to Medium as public.
Set the canonical URL to https://myblog.com/my-guide. Use tags: programming, tutorial.
```

## Multi-Platform Workflow

The most powerful pattern -- publish to Medium AND LinkedIn in one go:

```
Here's my article about AI trends:

[paste content]

1. Publish it on Medium as a draft with tags ai, tech, future
2. Create a LinkedIn post summarizing the 3 key points with a link to the Medium article
3. Schedule the LinkedIn post for tomorrow at 10am
```

## Medium API Limits

- **Tags:** Maximum 5 per article
- **Content format:** Markdown or HTML only (not plain text)
- **Rate limits:** Medium's API has undocumented rate limits. In practice, you won't hit them with normal publishing.
- **Images in content:** Use markdown image syntax (`![alt](url)`) with publicly accessible image URLs. Local file paths won't work -- upload images to an image host first, or use LinkedIn's upload tool and reference the URL.

## Troubleshooting

### "medium_publish_article" tool not showing

`MEDIUM_INTEGRATION_TOKEN` is not set. Add it to your config and restart Claude Desktop.

### 401 Unauthorized

Your integration token is invalid or expired. Generate a new one at [medium.com/me/settings/security](https://medium.com/me/settings/security).

### 403 Forbidden

Medium may have restricted API access for your account. This is rare but can happen with new accounts or accounts flagged for spam.

### Article published but no content shows

Make sure `content_format` matches your content. If you're writing markdown, use `markdown`. If you're pasting HTML, use `html`.
