# Troubleshooting

Common issues and how to fix them.

---

## Setup Issues

### Server crashes immediately on startup

**Error:** `Invalid environment configuration: LINKEDIN_CLIENT_ID: Required`

**Fix:** Set `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` in either your `.env` file or Claude Desktop config `env` block.

---

### "Cannot open database because the directory does not exist"

**Error:** `TypeError: Cannot open database because the directory does not exist`

**Fix:** The `data/` directory should be created automatically. If it fails:
```bash
mkdir -p data
```

---

### Claude Desktop doesn't show LinkedIn tools

**Symptoms:** No hammer icon, or LinkedIn tools don't appear in the tool list.

**Checklist:**
1. Verify `claude_desktop_config.json` is valid JSON (no trailing commas)
2. Check the `args` path is absolute and correct
3. Make sure you ran `npm run build` (Claude Desktop runs `dist/index.js`, not `src/`)
4. Restart Claude Desktop completely (quit and reopen, not just close the window)
5. Check Claude Desktop logs for error messages

---

### "Unexpected token" JSON parse error

**Error:** `Unexpected token '◇', "◇ injected"... is not valid JSON`

**Fix:** This was caused by `dotenv` v17 writing to stdout, which corrupts the MCP protocol. It's fixed in the current version. If you see this, rebuild:
```bash
npm run build
```

---

## Authentication Issues

### Browser doesn't open during authentication

**Symptoms:** Claude says it's waiting for authentication but no browser window appears.

**Fix:** Copy the authorization URL from Claude's response and paste it into your browser manually.

---

### "Authentication failed: timeout"

**Symptoms:** The callback server times out after 30 seconds.

**Causes:**
1. You didn't complete the LinkedIn authorization in time
2. The redirect URL in your LinkedIn app doesn't match `http://localhost:3456/callback`
3. Something is already running on port 3456

**Fix:** Try authenticating again. Check port 3456 is free:
```bash
lsof -i :3456
```

---

### "Not authenticated. Call linkedin_authenticate first."

**Fix:** Run authentication:
> Authenticate with LinkedIn

If you've already authenticated, your token file may be corrupt. Delete it and re-authenticate:
```bash
rm data/tokens.enc
```

---

### Token refresh fails

**Error:** `Token refresh failed: ...`

**Fix:** Your refresh token has expired (they last ~1 year) or was revoked. Re-authenticate:
> Authenticate with LinkedIn

---

## Posting Issues

### Posts fail with 403 Forbidden

**Error:** `LinkedIn API error (403): ...`

**Causes:**
1. The "Share on LinkedIn" product is not approved in your LinkedIn developer app
2. Your access token doesn't have the `w_member_social` scope

**Fix:** Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps), open your app, go to Products tab, and verify "Share on LinkedIn" is listed under "Added products". If not, request access.

---

### Posts fail with 401 Unauthorized

**Error:** `LinkedIn API error (401): ...`

**Fix:** Your access token is invalid or expired. The server should auto-refresh, but if it doesn't:
> Authenticate with LinkedIn

---

### Posts fail with 429 Rate Limit

**Error:** `Rate limit exceeded. Retry after Xs`

**Fix:** You've hit LinkedIn's rate limit. Wait the specified time and try again. The server enforces local rate limits (100 posts/day, 150 API calls/minute) to prevent this, but LinkedIn has its own limits too.

---

### "Post text cannot exceed 3000 characters"

**Fix:** Shorten your post. The 3000 character limit includes hashtags. Ask Claude to make it more concise:
> Rewrite this post to be under 2500 characters while keeping the key points.

---

### Hashtags not appearing

**Fix:** Provide hashtags without the `#` symbol:
- Wrong: `hashtags: ["#ai", "#tech"]`
- Right: `hashtags: ["ai", "tech"]`

The server adds the `#` prefix automatically.

---

## Scheduling Issues

### Scheduled post wasn't published

**Causes:**
1. Claude Desktop was closed when the scheduled time arrived
2. The server crashed or restarted

**Fix:** The scheduler checks every minute when the server is running. If Claude Desktop was closed, the post will publish the next time you open it (since the scheduled time has passed, it will publish immediately on the next poll).

Check status:
> List my scheduled LinkedIn posts

---

### "Scheduled time must be at least 5 minutes in the future"

**Fix:** The scheduled time must be at least 5 minutes from now. Use a later time.

---

### Scheduled post shows FAILED status

**Fix:** Check the error message:
> List my failed scheduled posts

The server retries 3 times. Common failure reasons:
- Token expired (re-authenticate and the next retry will work)
- Rate limit exceeded (will resolve on its own)
- Content validation failed (fix the content and schedule again)

---

## Image Upload Issues

### "Unsupported image type"

**Fix:** Only JPEG, PNG, and GIF are supported. Convert your image to one of these formats.

---

### "Image too large"

**Fix:** Images must be under 8MB. Resize or compress the image.

---

### "File not found"

**Fix:** Check the file path. The server supports:
- Absolute paths: `/Users/me/Desktop/photo.jpg`
- Home directory: `~/Desktop/photo.jpg`
- Relative paths: `./images/photo.jpg` (relative to project root)

---

## Development Issues

### TypeScript compilation errors after editing

```bash
npm run typecheck
```

Fix all type errors before rebuilding.

---

### Tests failing

```bash
npm test
```

Check the test output for specific failures. Tests use MSW to mock LinkedIn API -- they don't require real credentials.

---

## Getting More Help

### Enable debug logging

In your `.env` or Claude Desktop config:
```
LOG_LEVEL=debug
```

Logs go to stderr and appear in Claude Desktop's MCP log viewer.

### Check Claude Desktop MCP logs

Claude Desktop shows MCP server logs in its developer tools. Look for error messages from the LinkedIn MCP server.

### File an issue

If you're stuck, [open an issue](https://github.com/supersaiyane/linkedinMCP/issues) with:
1. The error message
2. What you were trying to do
3. Your Node.js version (`node --version`)
4. Your OS
