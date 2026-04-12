---
title: Troubleshooting
sidebar_label: Troubleshooting
sidebar_position: 11
audience: L2-L3
---

# Troubleshooting

**TL;DR:** This page covers every common error you may encounter, organized by category. Each entry follows the same format: what you see, why it happens, and how to fix it step by step.

**Prerequisite knowledge:** You should have the server installed ([Getting Started](Getting-Started)) and configured ([Configuration](Configuration)). Familiarity with running terminal commands and reading error messages.

---

## Setup Issues

### Server crashes: missing env vars

**Symptom:** Server exits immediately on startup with an error listing missing variables.

**Who hits this:** First-time users who have not configured credentials.

**Severity:** Blocking -- the server will not start.

**What you are seeing:**

```
Invalid environment configuration:
  - LINKEDIN_CLIENT_ID: Required
  - LINKEDIN_CLIENT_SECRET: Required
```

**Cause:** The server validates all environment variables at startup using Zod schemas. Required variables (`LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`) have no defaults and must be provided.

**Fix:**

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and set your LinkedIn credentials:
   ```bash
   LINKEDIN_CLIENT_ID=<YOUR_CLIENT_ID>
   LINKEDIN_CLIENT_SECRET=<YOUR_CLIENT_SECRET>
   ```
3. Start the server again:
   ```bash
   npm run dev
   ```
   Expected output: The server starts without the validation error.

**Root cause:** The fail-fast validation is intentional. Running without valid credentials would cause every tool call to fail with a less informative error.

**Prevention:** Always run `cp .env.example .env` and fill in required values before first startup.

---

### "Directory does not exist" error

**Symptom:** Server crashes with a SQLite error about a missing directory.

**Who hits this:** Users running the server for the first time, or after deleting the `data/` directory.

**Severity:** Blocking -- the scheduler cannot initialize.

**What you are seeing:**

```
TypeError: Cannot open database because the directory does not exist
```

**Cause:** The `better-sqlite3` library requires the parent directory of the database file to exist before creating the file. In some edge cases, the automatic directory creation may fail (permission issues, symlink targets, etc.).

**Fix:**

1. Create the data directory manually:
   ```bash
   mkdir -p data
   ```
2. Verify the directory exists and has correct permissions:
   ```bash
   ls -la data/
   ```
   Expected output: An empty directory owned by your user.
3. Start the server again:
   ```bash
   npm run dev
   ```

**Root cause:** The server normally creates the `data/` directory automatically with `fs.mkdirSync({ recursive: true })`. This error occurs when that automatic creation fails silently (e.g., the path resolves to a location without write permission).

**Prevention:** Ensure the project directory is writable by your user. If using a custom `SCHEDULER_DB_PATH`, verify the parent directory exists.

---

### "Unexpected token" JSON parse error

**Symptom:** Claude Desktop fails to connect to the server. MCP logs show a JSON parse error.

**Who hits this:** Users running older versions of the server that used dotenv v17.

**Severity:** Blocking -- Claude Desktop cannot communicate with the server.

**What you are seeing:**

```
Unexpected token '<char>', "<string>"... is not valid JSON
```

**Cause:** dotenv v17 introduced a behavior where it writes informational messages to stdout. In stdio transport mode, stdout is reserved exclusively for MCP JSON-RPC messages. Any non-JSON-RPC data on stdout corrupts the protocol stream, causing Claude Desktop's JSON parser to fail.

**Fix:**

1. Pull the latest code (the fix uses `configDotenv({ quiet: true })`):
   ```bash
   git pull origin main
   ```
2. Reinstall dependencies:
   ```bash
   npm install
   ```
3. Rebuild:
   ```bash
   npm run build
   ```
4. Restart Claude Desktop (quit and reopen, not close the window).

**Root cause:** The `quiet: true` option suppresses dotenv's stdout output. The current codebase includes this fix.

**Prevention:** Keep the project up to date. When adding any dependency that might produce console output, verify it does not write to stdout in stdio mode.

---

### Claude Desktop does not show tools

**Symptom:** No hammer icon appears in Claude Desktop, or LinkedIn/Medium tools are missing from the tool list.

**Who hits this:** Users who have configured Claude Desktop but see no MCP tools.

**Severity:** Blocking -- cannot use any server functionality.

**What you are seeing:** Claude Desktop's tool picker shows no LinkedIn tools, or the MCP server indicator is absent.

**Cause:** Multiple possible causes: invalid JSON in the config file, incorrect path to the built server, server not built, or Claude Desktop not fully restarted.

**Fix:**

1. Validate your `claude_desktop_config.json` is valid JSON (no trailing commas, no comments):
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool
   ```
   Expected output: Pretty-printed JSON without errors.

2. Verify the `args` path is absolute and points to the compiled output:
   ```bash
   ls -la <ABSOLUTE_PATH_TO_PROJECT>/dist/index.js
   ```
   Expected output: The file exists.

3. If the file does not exist, build the project:
   ```bash
   npm run build
   ```
   Expected output: TypeScript compiles without errors, producing `dist/index.js`.

4. Quit Claude Desktop completely (right-click the dock icon and Quit, or Cmd+Q on macOS) and reopen it. Closing the window is not sufficient.

5. Check Claude Desktop's MCP logs for error messages from the server startup.

**Root cause:** Claude Desktop reads the config file on launch and starts MCP servers as child processes. If the config is invalid, the path is wrong, or the compiled output does not exist, the server never starts.

**Prevention:** Always use absolute paths in `claude_desktop_config.json`. Always run `npm run build` after code changes. Always fully restart Claude Desktop after config changes.

---

## Authentication Issues

### Browser does not open during auth

**Symptom:** Claude reports that authentication is in progress, but no browser window appears.

**Who hits this:** Users on headless servers, remote SSH sessions, or systems where the default browser is not configured.

**Severity:** Non-blocking -- there is a manual workaround.

**What you are seeing:** Claude's response includes an authorization URL but no browser opens.

**Cause:** The `open` package attempts to launch the system's default browser. This fails silently in environments without a display server, or when the default browser handler is not configured.

**Fix:**

1. Look at Claude's response for the authorization URL. It will contain a URL starting with `https://www.linkedin.com/oauth/v2/authorization?...`
2. Copy the entire URL.
3. Paste it into any browser on any machine that can reach `localhost:3456` on the server.
4. Complete the LinkedIn login and authorization.
5. The callback will arrive at the server, and authentication will complete.

**Root cause:** The server catches the browser-open failure and continues waiting for the callback. The URL is always returned in the tool response as a fallback.

**Prevention:** For permanently headless environments, consider using `TOKEN_STORE_TYPE=env` with pre-obtained tokens instead of browser-based OAuth.

---

### Auth timeout

**Symptom:** Authentication fails after waiting.

**Who hits this:** Users who do not complete the LinkedIn login within the timeout window, or users whose redirect URI is misconfigured.

**Severity:** Non-blocking -- retry by authenticating again.

**What you are seeing:**

```
OAuth callback timed out after 120 seconds
```

**Cause:** The temporary callback server on port 3456 waits 120 seconds for LinkedIn to redirect back with an authorization code. If no callback arrives, the server times out and closes.

**Fix:**

1. Verify your LinkedIn app's redirect URI matches exactly:
   ```
   http://localhost:3456/callback
   ```
   Check this at https://www.linkedin.com/developers/apps > your app > Auth tab > OAuth 2.0 settings > Authorized redirect URLs.

2. Verify port 3456 is not in use by another process:
   ```bash
   lsof -i :3456
   ```
   Expected output: No output (port is free) or only the MCP server's callback listener.

3. Try authenticating again and complete the LinkedIn login promptly.

**Root cause:** The most common cause is a redirect URI mismatch. LinkedIn redirects to the URI configured in the app settings, not the one in the authorization URL. If they differ, the callback never reaches the server.

**Prevention:** Double-check that the redirect URI in your LinkedIn app settings matches `LINKEDIN_REDIRECT_URI` (default: `http://localhost:3456/callback`) character-for-character, including the protocol (`http`, not `https` for localhost).

---

### "Not authenticated" error

**Symptom:** Any tool call fails with an authentication error.

**Who hits this:** Users who have not authenticated yet, or whose token file was deleted or corrupted.

**Severity:** Blocking for all tool operations except `linkedin_authenticate`.

**What you are seeing:**

```
Not authenticated. Call linkedin_authenticate first.
```

**Cause:** No valid token exists in the token store. Either authentication was never completed, the token file was deleted, or the encryption key changed.

**Fix:**

1. Ask Claude to authenticate:
   > Authenticate with LinkedIn

2. If that fails, delete the token file and try again:
   ```bash
   rm -f data/tokens.enc
   ```
   Then authenticate again.

3. If you changed `TOKEN_ENCRYPTION_KEY` since the last authentication, the existing file is unreadable. Delete it and re-authenticate.

**Root cause:** The `getValidToken()` method returns null when no token file exists, triggering this error.

**Prevention:** Authenticate once after initial setup. The server handles token refresh automatically after that.

---

### Token refresh fails

**Symptom:** Tools that previously worked start failing with a refresh error.

**Who hits this:** Users whose refresh token has expired (after ~365 days) or was revoked.

**Severity:** Blocking -- all API calls fail until re-authentication.

**What you are seeing:**

```
Token refresh failed: Request failed with status code 401
```

**Cause:** The refresh token is no longer valid. This happens when:
- The refresh token has expired (after approximately 365 days)
- You revoked the app's access in LinkedIn settings
- LinkedIn invalidated the token for security reasons

**Fix:**

1. Delete the stored token:
   ```bash
   rm -f data/tokens.enc
   ```
2. Re-authenticate:
   > Authenticate with LinkedIn
3. Verify the new authentication works:
   > Get my LinkedIn profile

**Root cause:** When a refresh attempt fails, the server deletes the stored token to prevent repeated failed refresh attempts, then throws `TokenRefreshError`.

**Prevention:** Refresh tokens last approximately 365 days. Annual re-authentication is expected.

---

## Posting Issues

### Posts fail with 403

**Symptom:** Creating a post returns a 403 Forbidden error.

**Who hits this:** Users whose LinkedIn developer app does not have the "Share on LinkedIn" product approved.

**Severity:** Blocking for all posting operations.

**What you are seeing:**

```
LinkedIn API error (403): Not enough permissions to access: POST /rest/posts
```

**Cause:** The `w_member_social` scope is required for posting. This scope is only available when the "Share on LinkedIn" product is approved in your LinkedIn developer app.

**Fix:**

1. Go to https://www.linkedin.com/developers/apps
2. Select your app.
3. Navigate to the "Products" tab.
4. Check if "Share on LinkedIn" appears under "Added products."
5. If not, click "Request access" for "Share on LinkedIn."
6. Wait for approval (usually instant for this product).
7. After approval, re-authenticate to get a token with the new scope:
   ```bash
   rm -f data/tokens.enc
   ```
   Then authenticate again via Claude.

**Root cause:** LinkedIn gates API access behind product approvals. Without the product, the scope is not granted during OAuth, and the API rejects requests.

**Prevention:** Follow the complete [LinkedIn App Setup](LinkedIn-App-Setup) guide, which includes requesting both required products.

---

### Posts fail with 429

**Symptom:** Creating a post returns a rate limit error.

**Who hits this:** Users who have posted frequently in a short period.

**Severity:** Temporary -- resolves after the rate limit window passes.

**What you are seeing:**

```
Rate limit exceeded. Retry after 45s
```

Or from LinkedIn directly:

```
LinkedIn API error (429): Too Many Requests
```

**Cause:** Either the server's local rate limiter or LinkedIn's server-side rate limit has been exceeded. The server enforces local limits (default: 100 posts/day, 150 API calls/minute) as a safeguard.

**Fix:**

1. Wait the specified retry-after duration.
2. If you need higher limits, adjust the local rate limiter in your configuration:
   ```bash
   RATE_LIMIT_POSTS_PER_DAY=200
   RATE_LIMIT_API_PER_MINUTE=300
   ```
   Note: Increasing local limits does not change LinkedIn's server-side limits.
3. Retry the post.

**Root cause:** Rate limiting is a protective measure. LinkedIn enforces its own limits regardless of local settings.

**Prevention:** Space out posts. For bulk publishing, use the scheduler to distribute posts across time windows.

---

## Scheduling Issues

### Scheduled post was not published

**Symptom:** A post was scheduled but its status remains PENDING past the scheduled time.

**Who hits this:** Users who close Claude Desktop before the scheduled time.

**Severity:** Non-blocking -- the post will publish when the server runs again.

**What you are seeing:** Running "List my scheduled LinkedIn posts" shows a PENDING post with a `scheduled_at` time in the past.

**Cause:** The scheduler polls every minute via a cron job. If the server (and therefore Claude Desktop) is not running at the scheduled time, no polling occurs.

**Fix:**

1. Confirm the post is still pending:
   > List my scheduled LinkedIn posts
2. The post will publish on the next poll cycle (within 1 minute) after the server starts, since its scheduled time has already passed.
3. If you need immediate publication, no action is needed beyond keeping Claude Desktop open -- the next poll will catch it.

**Root cause:** The scheduler is an in-process cron job, not a system-level service. It only runs while the MCP server process is alive.

**Prevention:** Keep Claude Desktop open around the scheduled time, or deploy the server as a persistent process (e.g., via Docker with `MCP_TRANSPORT=sse`).

---

### Scheduled post shows FAILED status

**Symptom:** A scheduled post has status FAILED with an error message.

**Who hits this:** Users whose scheduled posts encountered persistent errors during publication.

**Severity:** The post was not published. Manual intervention is needed.

**What you are seeing:**

```
ID: abc-123
Status: FAILED
Error: LinkedIn API error (401): Unauthorized
Attempts: 3
```

**Cause:** The scheduler retries each post up to 3 times. If all attempts fail, the post is marked FAILED and no further retries occur. Common failure reasons:

- Token expired and could not be refreshed
- Rate limit exceeded on all 3 attempts
- Content validation failed at the LinkedIn API level
- Network connectivity issues persisted across all attempts

**Fix:**

1. Check the error message for the specific failure reason:
   > List my failed scheduled posts

2. Address the underlying issue:
   - For auth errors: re-authenticate, then schedule a new post
   - For rate limits: schedule the new post for a later time
   - For content errors: fix the content and schedule again

3. Schedule a new post with the corrected content. Failed posts cannot be retried -- create a new one.

**Root cause:** The 3-attempt limit prevents the scheduler from retrying indefinitely, which would waste API quota on permanently failing posts.

**Prevention:** Ensure the server stays authenticated (tokens auto-refresh, but check periodically). Space out scheduled posts to avoid rate limits.

---

## Image Upload Issues

### Unsupported image type

**Symptom:** Image upload fails with a MIME type error.

**Who hits this:** Users uploading images in formats LinkedIn does not accept.

**Severity:** Blocking for that upload.

**What you are seeing:**

```
Unsupported image type: image/webp. Allowed: jpeg, png, gif
```

**Cause:** LinkedIn's image upload API accepts JPEG, PNG, and GIF only. Other formats (WebP, SVG, TIFF, BMP) are rejected by the server before the upload is attempted.

**Fix:**

1. Convert the image to a supported format. Example using ImageMagick:
   ```bash
   convert input.webp output.png
   ```
2. Upload the converted image:
   > Upload the image at /path/to/output.png to LinkedIn

**Root cause:** The server validates MIME type based on file extension before uploading to avoid wasting an API call on a file LinkedIn would reject.

**Prevention:** Use JPEG, PNG, or GIF images for LinkedIn posts.

---

### Image too large

**Symptom:** Image upload fails with a size error.

**Who hits this:** Users uploading high-resolution or uncompressed images.

**Severity:** Blocking for that upload.

**What you are seeing:**

```
Image too large: 12.5MB. Maximum: 8MB
```

**Cause:** LinkedIn's image upload API has an 8MB limit. The server validates this locally before attempting the upload.

**Fix:**

1. Compress or resize the image. Example using ImageMagick:
   ```bash
   convert input.png -resize 2048x2048 -quality 85 output.jpg
   ```
2. Verify the new size:
   ```bash
   ls -lh output.jpg
   ```
   Expected output: File size under 8MB.
3. Upload the resized image.

**Root cause:** LinkedIn enforces an 8MB limit on image uploads.

**Prevention:** Resize images to reasonable dimensions before uploading. Most LinkedIn posts display well at 1200x628 pixels or smaller.

---

### File not found

**Symptom:** Image upload fails because the file does not exist at the given path.

**Who hits this:** Users providing incorrect or relative file paths.

**Severity:** Blocking for that upload.

**What you are seeing:**

```
File not found: /path/to/nonexistent.jpg
```

**Cause:** The specified file path does not point to an existing file. Common reasons: typos in the path, relative path resolving to the wrong directory, or the file was moved.

**Fix:**

1. Verify the file exists:
   ```bash
   ls -la /path/to/your/image.jpg
   ```
2. Use an absolute path to avoid ambiguity:
   ```
   /Users/<USERNAME>/Desktop/photo.jpg
   ```
3. The server also supports `~` expansion:
   ```
   ~/Desktop/photo.jpg
   ```

**Root cause:** The `MediaHandler` uses `fs.accessSync` to verify the file exists before reading it.

**Prevention:** Use absolute paths or `~`-relative paths. Verify the file exists before requesting the upload.

---

## Telegram Issues

### Telegram notifications not arriving

**Symptom:** Posts publish, but no Telegram notification is received.

**Who hits this:** Users who have configured Telegram but are not receiving messages.

**Severity:** Non-blocking -- posts are still published. Only notifications are affected.

**What you are seeing:** Posts succeed with no error, but your Telegram bot is silent.

**Cause:** Multiple possible causes: environment variables not set, bot not started, chat ID incorrect, or bot blocked.

**Fix:**

1. Verify both environment variables are set:
   ```bash
   echo $TELEGRAM_BOT_TOKEN
   echo $TELEGRAM_CHAT_ID
   ```
   Both must be non-empty.

2. Verify you have sent at least one message to the bot. Telegram bots cannot initiate conversations -- you must message the bot first (send `/start` or any message).

3. Verify the chat ID is correct by calling the Telegram API directly:
   ```bash
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates"
   ```
   Look for your chat ID in the response. It should match `TELEGRAM_CHAT_ID`.

4. Restart Claude Desktop after changing environment variables.

5. Check Claude Desktop's MCP logs for "Telegram notification failed" warnings. These indicate the bot token or chat ID is incorrect.

**Root cause:** Notifications are best-effort. Failures are logged but never throw or block the main tool operation.

**Prevention:** Follow the complete [Telegram Setup](Telegram-Setup) guide. Test the bot manually before relying on automated notifications.

---

## Medium Issues

### Medium tools not showing

**Symptom:** `medium_publish_article` and `medium_get_profile` tools do not appear in Claude Desktop.

**Who hits this:** Users who want to use Medium integration but have not set the token.

**Severity:** Blocking for Medium functionality.

**What you are seeing:** Only LinkedIn tools appear. No Medium tools in the tool list.

**Cause:** The Medium client and its tools are only instantiated when `MEDIUM_INTEGRATION_TOKEN` is set. Without it, the tools are not registered with the MCP server.

**Fix:**

1. Generate a Medium integration token at https://medium.com/me/settings/security
2. Add it to your configuration:
   ```bash
   MEDIUM_INTEGRATION_TOKEN=<YOUR_MEDIUM_TOKEN>
   ```
3. Restart Claude Desktop.
4. Verify the tools appear in the tool list.

**Root cause:** This is intentional conditional registration. Tools that require configuration that is not present are excluded to avoid confusing error messages when called.

**Prevention:** Follow the [Medium Setup](Medium-Setup) guide to configure the integration.

---

### Medium 401

**Symptom:** Medium operations fail with an authentication error.

**Who hits this:** Users whose Medium integration token is invalid or expired.

**Severity:** Blocking for Medium operations.

**What you are seeing:**

```
Medium API error: 401 Unauthorized
```

**Cause:** The integration token is either invalid (typo, partial copy) or has been revoked.

**Fix:**

1. Go to https://medium.com/me/settings/security
2. Revoke the old integration token if it is listed.
3. Generate a new integration token.
4. Update `MEDIUM_INTEGRATION_TOKEN` in your configuration with the new token.
5. Restart Claude Desktop.
6. Verify by fetching your Medium profile:
   > Get my Medium profile

**Root cause:** Medium integration tokens do not expire automatically, but they can be revoked in settings or invalidated if Medium detects unusual activity.

**Prevention:** Store the token securely and avoid sharing it. If you suspect the token is compromised, revoke and regenerate.

---

## Debugging Tips

### Enable debug logging

Set `LOG_LEVEL=debug` in your configuration to see detailed request/response logging:

```bash
LOG_LEVEL=debug
```

In stdio mode, logs appear on stderr. Claude Desktop surfaces these in its MCP log viewer (check developer tools or MCP server logs).

### Check Claude Desktop MCP logs

Claude Desktop provides access to MCP server logs through its developer tools. Look for error messages from the `amplifyr-mcp` server. The log entries include structured JSON with the service name, timestamp, and error details.

### Test the server independently

Run the server directly to see startup errors:

```bash
npm run dev
```

Expected output for a healthy startup:

```
{"level":30,"time":"...","service":"amplifyr-mcp","msg":"Connected via stdio transport"}
```

If the server crashes, the error message will appear before this line.

### File an issue

If you are stuck after trying the fixes above, open an issue at https://github.com/supersaiyane/AmplifyrMCP/issues with:

1. The full error message
2. What you were trying to do
3. Your Node.js version (`node --version`)
4. Your operating system
5. Whether you are using `.env`, Claude Desktop config, or system env vars

---

## Key Takeaways

- Most startup issues are caused by missing environment variables or incorrect paths in `claude_desktop_config.json`.
- Authentication issues almost always resolve by deleting `data/tokens.enc` and re-authenticating.
- 403 errors mean your LinkedIn app is missing the "Share on LinkedIn" product approval.
- Scheduled post failures are caused by the server not running at the scheduled time or by expired tokens.
- Telegram and Medium integrations only activate when their respective tokens are set.
- Enable `LOG_LEVEL=debug` for detailed diagnostic output.

## Community Management API Issues

### 403: Not enough permissions to access partnerApiSocialActions

**Symptom:** `linkedin_get_comments`, `linkedin_get_post_stats`, or `linkedin_reply_to_comment` returns a 403 error mentioning `partnerApiSocialActions`.

**Who hits this:** Anyone trying to use engagement tools without the Community Management API app configured.

**Severity:** Expected behavior if community app is not set up. Not a bug.

**Cause:** LinkedIn requires the "Community Management API" product to be enabled on a **separate** developer app. This product cannot coexist with "Share on LinkedIn" on the same app.

**Fix:**

1. Create a new LinkedIn developer app at linkedin.com/developers
2. On the Products tab, request **only** "Community Management API" (do not add any other products)
3. Wait for approval (may be instant or take 24-48 hours)
4. Copy the Client ID and Client Secret into your `.env`:
   ```
   LINKEDIN_COMMUNITY_CLIENT_ID=your_second_app_id
   LINKEDIN_COMMUNITY_CLIENT_SECRET=your_second_app_secret
   ```
5. Rebuild: `npm run build`
6. Restart Claude Desktop
7. Say "Authenticate with Community Management API" (one-time, uses port 3457)

**Root cause:** LinkedIn gates socialActions endpoints behind the Community Management API product, and requires it to be the sole product on the app for legal/security reasons.

### Engagement tools not showing in Claude Desktop

**Symptom:** `linkedin_get_comments`, `linkedin_get_post_stats`, `linkedin_reply_to_comment`, `linkedin_like_post`, and `linkedin_authenticate_community` tools do not appear.

**Cause:** `LINKEDIN_COMMUNITY_CLIENT_ID` is not set in your environment.

**Fix:** Set `LINKEDIN_COMMUNITY_CLIENT_ID` and `LINKEDIN_COMMUNITY_CLIENT_SECRET` in your `.env` or Claude Desktop config, rebuild, and restart.

### Community auth fails: port 3457 in use

**Symptom:** "Authenticate with Community Management API" fails with a port-in-use error.

**Fix:** Free port 3457 (another process is using it) and retry.

---

## Related Pages

- [Configuration](Configuration) -- Environment variable reference
- [Authentication](Authentication) -- OAuth 2.0 flow details
- [LinkedIn App Setup](LinkedIn-App-Setup) -- LinkedIn developer app configuration
- [Telegram Setup](Telegram-Setup) -- Telegram bot configuration
- [Medium Setup](Medium-Setup) -- Medium integration configuration
- [Tools Reference](Tools-Reference) -- Complete tool documentation
