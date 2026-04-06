---
title: Quick Start Guide
sidebar_label: Quick Start Guide
sidebar_position: 3
audience: L1-L2
---

# Quick Start Guide

**TL;DR:** Copy `.env.example`, add your LinkedIn credentials, register the server in Claude Desktop config, restart Claude Desktop, authenticate, and post. Ten steps, about 5 minutes.

**Prerequisite knowledge:** You have completed [Installation](Installation). The server is built and `dist/index.js` exists.

---

## Before You Begin

Confirm the build is in place:

```bash
ls dist/index.js
```

Expected output:

```
dist/index.js
```

If the file does not exist, go back to [Installation](Installation) and run `npm run build`.

You also need a LinkedIn developer app with Client ID and Client Secret. If you do not have one yet, follow [LinkedIn-App-Setup](LinkedIn-App-Setup) first, then return here.

---

## Step 1: Create your environment file

From the project root directory:

```bash
cp .env.example .env
```

This creates a `.env` file with all available settings and sensible defaults. You only need to change two values.

---

## Step 2: Add your LinkedIn credentials

Open `.env` in any text editor and fill in your Client ID and Client Secret:

```bash
LINKEDIN_CLIENT_ID=<YOUR_LINKEDIN_CLIENT_ID>
LINKEDIN_CLIENT_SECRET=<YOUR_LINKEDIN_CLIENT_SECRET>
```

Replace `<YOUR_LINKEDIN_CLIENT_ID>` and `<YOUR_LINKEDIN_CLIENT_SECRET>` with the values from your LinkedIn developer app's "Auth" tab.

Leave all other values at their defaults for now. See [Configuration](Configuration) for the full list of options.

---

## Step 3: Register the server in Claude Desktop

Open your Claude Desktop configuration file:

| Operating System | Config File Path |
|-----------------|-----------------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

Add the following entry inside the `mcpServers` object. If the file does not exist or is empty, create it with the full structure shown:

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["<ABSOLUTE_PATH_TO_PROJECT>/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "<YOUR_LINKEDIN_CLIENT_ID>",
        "LINKEDIN_CLIENT_SECRET": "<YOUR_LINKEDIN_CLIENT_SECRET>",
        "TOKEN_ENCRYPTION_KEY": "<ANY_STRING_AT_LEAST_32_CHARACTERS>"
      }
    }
  }
}
```

Replace the three placeholder values:

- `<ABSOLUTE_PATH_TO_PROJECT>` -- The full path to your cloned repository (e.g., `/Users/you/AmplifyrMCP` or `C:\Users\you\AmplifyrMCP`)
- `<YOUR_LINKEDIN_CLIENT_ID>` -- Same value as in your `.env` file
- `<YOUR_LINKEDIN_CLIENT_SECRET>` -- Same value as in your `.env` file
- `<ANY_STRING_AT_LEAST_32_CHARACTERS>` -- Any string of 32 or more characters used to encrypt stored tokens (e.g., `my-super-secret-encryption-key-2024!!`)

Note: Credentials can go in the `.env` file, in the Claude Desktop config `env` block, or both. The Claude Desktop config approach keeps secrets out of the project directory.

---

## Step 4: Restart Claude Desktop

Quit Claude Desktop completely (not minimize -- fully quit the application), then reopen it.

After restart, look for the hammer icon in the chat input area. This icon indicates that MCP tools are loaded and available.

Expected result: The hammer icon appears in the bottom-left of the chat input field.

If the hammer icon does not appear, check [Troubleshooting](Troubleshooting) for common causes.

---

## Step 5: Authenticate with LinkedIn

Open a new chat in Claude Desktop and type:

```
Authenticate with LinkedIn
```

Expected result: Claude responds with a message containing an authorization URL, and your default browser opens to the LinkedIn login page.

```
Opening your browser for LinkedIn authorization...

If the browser doesn't open, visit this URL:
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=...

Waiting for you to authorize (30 second timeout)...
```

---

## Step 6: Authorize in your browser

In the browser window that opened:

1. Log in to LinkedIn if you are not already logged in.
2. Review the permissions being requested (posting on your behalf, reading your profile).
3. Click the "Allow" button.

Expected result: The browser shows a success page:

```
LinkedIn Connected!

You can close this window and return to your terminal.
```

Back in Claude Desktop, Claude confirms the authentication:

```
Authenticated as <YOUR_NAME>
LinkedIn URN: urn:li:person:abc123
```

You will not need to repeat this step. Tokens are encrypted and stored locally at `./data/tokens.enc`. They auto-refresh for approximately one year.

---

## Step 7: Create your first LinkedIn post

In the same Claude Desktop chat (or a new one), type:

```
Create a LinkedIn post: Hello from MCP! This is my first automated post using the AmplifyrMCP.
```

Expected result:

```
Post published!

Link: https://www.linkedin.com/feed/update/urn:li:share:7654321/
URN: urn:li:share:7654321
```

Claude returns the direct URL to your new post on LinkedIn.

---

## Step 8: Check your LinkedIn feed

Open LinkedIn in your browser or mobile app. Your post should appear at the top of your activity feed. The post content matches what you told Claude to publish.

---

## Step 9 (Optional): Verify your profile

Confirm the server can read your profile data:

```
Show my LinkedIn profile
```

Expected result:

```
LinkedIn Profile:
  Name: <YOUR_NAME>
  URN: urn:li:person:abc123
```

---

## Step 10 (Optional): Try scheduling

Schedule a post for a future time:

```
Schedule a LinkedIn post for tomorrow at 9:00 AM: Starting the week with a fresh perspective on AI-assisted workflows.
```

Expected result:

```
Post scheduled for 2026-04-07T09:00:00.000Z
Schedule ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

The server stores the post in a local SQLite database and publishes it automatically at the scheduled time (the server must be running at that time for the post to publish).

To see all scheduled posts:

```
List my scheduled LinkedIn posts
```

---

## What to Try Next

Now that the server is working, explore these capabilities:

| Action | Example Prompt |
|--------|---------------|
| Post with hashtags | "Post on LinkedIn about TypeScript tips. Use hashtags: typescript, webdev, programming" |
| Upload an image | "Upload this image for LinkedIn: /path/to/photo.jpg" |
| Publish an article | "Publish a LinkedIn article titled 'Getting Started with MCP' linking to https://example.com/article" |
| Set up Telegram | See [Telegram-Setup](Telegram-Setup) for push notifications on post events |
| Set up Medium | See [Medium-Setup](Medium-Setup) for cross-posting articles to Medium |
| Browse all tools | See [Tools-Reference](Tools-Reference) for the complete tool catalog |
| Workflow recipes | See [Automation-Recipes](Automation-Recipes) for multi-step prompt templates |

---

## Quick Verification Checklist

- [ ] `dist/index.js` exists (build completed)
- [ ] `.env` contains `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`
- [ ] `claude_desktop_config.json` has the `linkedin` MCP server entry with correct absolute path
- [ ] Claude Desktop shows the hammer icon after restart
- [ ] "Authenticate with LinkedIn" opens the browser and completes authorization
- [ ] "Show my LinkedIn profile" returns your name and URN
- [ ] "Create a LinkedIn post: test" publishes and returns a URL

---

## Key Takeaways

- The minimum configuration requires two values: `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`.
- Authentication happens once. Tokens persist encrypted on disk and auto-refresh for about a year.
- The server must be registered in `claude_desktop_config.json` with an absolute path to `dist/index.js`.
- Claude Desktop must be fully restarted (not refreshed) after config changes.
- All interaction happens through natural language in Claude Desktop -- no CLI commands needed after setup.

## Related Pages

- [Configuration](Configuration) -- Full list of environment variables and advanced settings
- [Tools-Reference](Tools-Reference) -- Detailed reference for all 9 tools
- [Automation-Recipes](Automation-Recipes) -- Multi-step workflows and prompt templates
- [Telegram-Setup](Telegram-Setup) -- Add push notifications (2 minutes)
- [Medium-Setup](Medium-Setup) -- Add Medium article publishing (1 minute)
- [Troubleshooting](Troubleshooting) -- Solutions for common issues
