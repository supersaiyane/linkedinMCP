---
title: Medium Integration Setup
sidebar_label: Medium Setup
sidebar_position: 9
audience: L1-L2
---

# Medium Integration Setup

**TL;DR:** Get an integration token from Medium's settings page and add it to your environment config. This enables two tools: `medium_publish_article` (publish markdown or HTML articles with tags, draft/public/unlisted modes, and canonical URLs) and `medium_get_profile` (view your Medium identity).

**Prerequisite knowledge:**

- A Medium account ([medium.com](https://medium.com))
- Familiarity with environment variables or the Claude Desktop config file
- The LinkedIn MCP server installed and running (see [Getting Started](Getting-Started))

---

## What This Does (L1)

The Medium integration lets you publish articles to your Medium account directly from Claude Desktop. You can write in markdown or HTML, assign up to 5 tags, choose whether to publish immediately or save as a draft, and set a canonical URL when cross-posting content from another site.

Medium integration is optional. If the `MEDIUM_INTEGRATION_TOKEN` environment variable is not set, the server starts normally but the two Medium tools do not appear.

---

## Step-by-Step Setup (L2)

### Step 1: Get a Medium Integration Token

1. Go to [medium.com/me/settings/security](https://medium.com/me/settings/security)
2. Scroll down to the **"Integration tokens"** section
3. Enter a description in the text field (e.g., `LinkedIn MCP Server`)
4. Click **"Get integration token"**
5. Copy the generated token

The token is a long alphanumeric string. It does not expire unless you revoke it manually.

### Step 2: Configure the Environment Variable

Add the token to your `.env` file:

```bash
MEDIUM_INTEGRATION_TOKEN=<MEDIUM_TOKEN>
```

Or in the Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/path/to/linkedin-mcp-server/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "<LINKEDIN_CLIENT_ID>",
        "LINKEDIN_CLIENT_SECRET": "<LINKEDIN_CLIENT_SECRET>",
        "MEDIUM_INTEGRATION_TOKEN": "<MEDIUM_TOKEN>"
      }
    }
  }
}
```

### Step 3: Restart the Server

Quit and reopen Claude Desktop. Two new tools will become available: `medium_publish_article` and `medium_get_profile`. You can verify by asking Claude to show your Medium profile.

---

## Publish Statuses (L2)

Every article you publish through the API has one of three statuses:

| Status | Behavior |
|--------|----------|
| `draft` (default) | Saved to your Medium drafts. You can review, edit, add images, and publish manually from Medium's editor. |
| `public` | Published immediately to your Medium profile and distributed through Medium's recommendation system. |
| `unlisted` | Published but hidden from your profile page and Medium feeds. Accessible only via direct link. |

**Recommendation:** Use `draft` for most workflows. This gives you a chance to preview formatting, add inline images, adjust section breaks, and verify how the article renders on Medium before it goes live. Switch to `public` only when you are confident the content is final.

---

## Cross-Posting with Canonical URLs (L3)

### What is a canonical URL?

A canonical URL tells search engines which version of a piece of content is the original. When the same article exists at multiple URLs (your blog, Medium, LinkedIn), search engines need to know which one to index and rank. The canonical URL is that signal.

### Why it matters for SEO

Without a canonical URL, search engines may treat your Medium republication as duplicate content. This can dilute ranking signals across both URLs, reducing visibility for both your blog and your Medium post. Setting the canonical URL to your original blog post URL consolidates ranking authority on the original.

### How to use it

When cross-posting content that was first published on your own site, set `canonical_url` to the original URL:

```
Publish my blog post to Medium as public.
The original is at https://myblog.com/building-mcp-servers.
Set the canonical URL to https://myblog.com/building-mcp-servers.
Use tags: mcp, ai, tutorial.
```

Medium renders a small "Originally published at" link at the bottom of the article, pointing to the canonical URL.

---

## Multi-Platform Workflow Example (L2)

The MCP server supports publishing to both Medium and LinkedIn in a single conversation. A common pattern:

```
Here is my article about AI trends in 2026:

[paste article content]

1. Publish it on Medium as a draft with tags ai, technology, trends, future, predictions
2. Create a LinkedIn post summarizing the three main takeaways, with a link to the Medium article
3. Schedule the LinkedIn post for tomorrow at 10:00 AM UTC
```

This produces:

- A Medium draft you can review and publish when ready
- A LinkedIn post linking to the Medium article, scheduled for optimal engagement time
- A Telegram notification (if configured) when the scheduled LinkedIn post fires

---

## Medium API Limits and Constraints (L3)

| Constraint | Limit | Notes |
|------------|-------|-------|
| Tags per article | 5 maximum | Additional tags are silently dropped by Medium |
| Content format | `markdown` or `html` | Plain text is not accepted by the API |
| Images in content | URL references only | Use markdown syntax `![alt text](https://example.com/image.png)`. Local file paths do not work. Upload images to an image host first, or use the `linkedin_upload_media` tool and reference the resulting URL. |
| Title length | 200 characters maximum | Enforced by the MCP server's input validation |
| Rate limits | Undocumented | Medium's API has unpublished rate limits. Normal publishing patterns (a few articles per day) will not trigger them. |
| Article editing | Not supported via API | Once published, articles can only be edited through Medium's web editor |

---

## Troubleshooting

### `medium_publish_article` tool not showing in Claude Desktop

The `MEDIUM_INTEGRATION_TOKEN` environment variable is not set or is empty. Verify it is present in your config, then restart Claude Desktop.

### 401 Unauthorized

Your integration token is invalid or has been revoked. Generate a new one at [medium.com/me/settings/security](https://medium.com/me/settings/security) and update your config.

### 403 Forbidden

Medium may have restricted API access for your account. This is uncommon but can occur with new accounts or accounts flagged by Medium's abuse detection. Contact Medium support if the issue persists.

### Article published but content appears empty or malformed

Verify that `content_format` matches your actual content. If the content is markdown, use `markdown`. If the content contains HTML tags, use `html`. Mixing formats (e.g., sending markdown with `content_format` set to `html`) produces rendering errors.

### Images not displaying in published article

Medium's API requires image URLs to be publicly accessible on the internet. Common issues:

- The image URL points to a private or authenticated resource
- The image URL uses `localhost` or an internal network address
- The image host blocks hotlinking

Upload images to a public host (e.g., Imgur, Cloudflare Images, or your own CDN) before referencing them.

---

## Key Takeaways

- Medium integration requires a single environment variable: `MEDIUM_INTEGRATION_TOKEN`.
- Default to `draft` status and review on Medium before publishing publicly.
- Always set `canonical_url` when cross-posting content from your blog to preserve SEO authority.
- Images must be referenced by public URL; local file paths are not supported by Medium's API.
- Tags are capped at 5 per article.

## Related Pages

- [Getting Started](Getting-Started) -- initial server setup
- [Configuration](Configuration) -- full environment variable reference
- [Tools Reference](Tools-Reference) -- detailed parameter reference for `medium_publish_article` and `medium_get_profile`
- [Telegram Setup](Telegram-Setup) -- receive notifications when Medium articles are published
- [Troubleshooting](Troubleshooting) -- additional debugging guidance
