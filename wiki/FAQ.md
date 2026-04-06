# FAQ

## General

### Does this post to my personal profile or a company page?

**Personal profile.** All posts go to your personal LinkedIn feed. Company page posting requires a different API scope (`w_organization_social`) and is not supported in this version.

### Do I need to authenticate every time?

**No.** You authenticate once. Tokens are encrypted and stored on disk. Access tokens auto-refresh using the refresh token. You only need to re-authenticate if the refresh token expires (~1 year) or is revoked.

### Is this free to use?

**Yes.** The LinkedIn API is free for posting to your own profile. There are rate limits (100 posts/day, 150 API calls/minute) but you won't hit these in normal use.

### Does Claude read my LinkedIn feed or messages?

**No.** This server only has posting and profile-reading capabilities. It cannot read your feed, messages, connections, or other people's profiles. The scopes used (`w_member_social`, `openid`, `profile`) only allow posting and reading your own basic profile.

### Can other people use my MCP server to post as me?

**No.** The OAuth tokens are encrypted on your machine. Only someone with access to your computer AND the encryption key can use them.

---

## Setup

### Do I need a LinkedIn Page to create the developer app?

**Technically yes**, but it doesn't matter which Page. LinkedIn requires a Page association for app verification, but it has zero impact on where posts go. Create a placeholder Page if you don't have one.

### Can I use this with Claude Code (CLI) instead of Claude Desktop?

**Yes.** The server uses stdio transport, which works with any MCP client. Configure it the same way as Claude Desktop.

### Can I run this on a server/VPS?

**Yes.** Use SSE transport mode:
```bash
MCP_TRANSPORT=sse SSE_PORT=3001 node dist/index.js
```
For initial OAuth authentication, you'll need browser access once. After that, use `TOKEN_STORE_TYPE=env` with pre-obtained tokens for headless operation.

### Can I use Docker?

**Yes.**
```bash
docker build -t linkedin-mcp-server .
docker run --env-file .env -p 3001:3001 linkedin-mcp-server
```
Docker uses SSE transport by default.

---

## Usage

### What's the maximum post length?

**3000 characters**, including hashtags. This is a LinkedIn API limit.

### Can I post images?

**Yes.** Upload an image first with `linkedin_upload_media`, then reference the returned URN when creating a post. Supported formats: JPEG, PNG, GIF (max 8MB).

### Can I post videos?

**Not currently.** The LinkedIn video upload API is more complex and not yet supported. You can share video URLs as article/link posts.

### Can I edit or delete a post after publishing?

**Not through this MCP server.** The LinkedIn API supports editing and deleting, but these tools aren't implemented yet. You can edit/delete manually on LinkedIn.

### Can I schedule posts while Claude Desktop is closed?

**No.** The scheduler runs as part of the MCP server process, which is alive only while Claude Desktop is running. If Claude Desktop is closed when a scheduled time passes, the post will publish the next time you open it.

### What happens if a scheduled post fails?

The scheduler retries up to 3 times. After 3 failures, it marks the post as `FAILED` with an error message. You can check with "list my failed scheduled posts".

### Can I cancel a scheduled post?

**Currently through the database only.** A cancel tool isn't exposed yet, but the scheduler supports cancellation internally. This may be added in a future version.

---

## Security

### Where are my tokens stored?

In `data/tokens.enc`, encrypted with AES-256-GCM using your `TOKEN_ENCRYPTION_KEY`. The file has restrictive permissions (owner read/write only).

### Is my Client Secret safe?

As long as you don't commit your `.env` file (it's gitignored by default) or paste your secret into code. The recommended approach is to put secrets in the Claude Desktop config `env` block, which keeps them out of the project directory entirely.

### Can I rotate my encryption key?

Yes, but you'll need to re-authenticate after changing `TOKEN_ENCRYPTION_KEY`, since the old token file can't be decrypted with the new key.

### What data does this server send to LinkedIn?

Only what you explicitly ask it to post: text content, images, article links. It also reads your basic profile info (name, URN) for constructing API requests.

---

## Telegram

### Are Telegram notifications required?

**No.** Completely optional. If `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are not set, the server works exactly the same -- just without notifications.

### Can notifications fail silently?

**Yes, by design.** Notifications are best-effort. If Telegram is down or your token is wrong, the main operation (posting, scheduling, etc.) still succeeds. A warning is logged but nothing breaks.

### Can I use a Telegram group instead of a private chat?

**Yes.** Add the bot to a group, send a message in the group, then use the group's chat ID (it's negative, e.g., `-987654321`).

---

## Medium

### Do I need a Medium account to use the LinkedIn features?

**No.** Medium integration is completely optional. If `MEDIUM_INTEGRATION_TOKEN` is not set, the Medium tools simply don't appear. All LinkedIn features work independently.

### Can I cross-post from my blog to Medium?

**Yes.** Use the `canonical_url` parameter to set your original blog URL. This tells search engines which version is the original, preventing SEO penalties for duplicate content.

### Why is the default publish status "draft"?

Safety. A draft lets you review formatting, add images, and preview on Medium before publishing. You can always set `publish_status` to `public` if you want instant publishing.

### Can I edit a Medium article after publishing?

**Not through this MCP server.** Medium's API doesn't support editing published posts. You'd need to edit directly on medium.com.

---

## Troubleshooting

### See the [Troubleshooting](Troubleshooting.md) page for detailed error solutions.
