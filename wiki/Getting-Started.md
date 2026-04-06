# Getting Started

This guide walks you through setting up the LinkedIn MCP server from scratch. No prior MCP experience required.

## Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | 20 or higher | `node --version` |
| npm | 10 or higher | `npm --version` |
| Claude Desktop | Latest | [Download](https://claude.ai/download) |
| LinkedIn account | Personal | [linkedin.com](https://linkedin.com) |

## Step 1: Clone the Repository

```bash
git clone https://github.com/supersaiyane/linkedinMCP.git
cd linkedinMCP
```

## Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages including the MCP SDK, axios, SQLite, and more.

## Step 3: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder. Claude Desktop runs the compiled JS, not the TypeScript source.

## Step 4: Create a LinkedIn Developer App

Follow the [LinkedIn App Setup](LinkedIn-App-Setup.md) guide to get your Client ID and Client Secret.

## Step 5: Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:

```bash
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
```

That's the minimum. See [Configuration](Configuration.md) for all options.

## Step 6: Connect to Claude Desktop

Open your Claude Desktop config file:

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

Add this to the `mcpServers` section:

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/full/path/to/linkedinMCP/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "your_client_id",
        "LINKEDIN_CLIENT_SECRET": "your_client_secret",
        "TOKEN_ENCRYPTION_KEY": "pick_any_string_at_least_32_characters"
      }
    }
  }
}
```

**Important:** Replace `/full/path/to/linkedinMCP` with the actual absolute path to your cloned repo.

**Note:** You can put credentials either in the `.env` file OR in the Claude Desktop config `env` block. Either works. The Claude Desktop config approach keeps secrets out of the project directory entirely.

## Step 7: Restart Claude Desktop

Quit Claude Desktop completely and reopen it. You should see a hammer icon in the chat input area, indicating MCP tools are available.

## Step 8: Authenticate

In a new Claude Desktop chat, type:

> Authenticate with LinkedIn

Your browser will open to the LinkedIn authorization page. Sign in, click "Allow", and you'll see a success page. Claude will confirm with your profile info.

**You only need to do this once.** Tokens are encrypted and stored locally. They auto-refresh for about a year.

## Step 9: (Optional) Set Up Telegram Notifications

Get notified on your phone whenever a post publishes. See [Telegram Setup](Telegram-Setup.md) -- takes 2 minutes.

## Step 10: (Optional) Set Up Medium

Publish articles to Medium from Claude Desktop. See [Medium Setup](Medium-Setup.md) -- takes 1 minute.

## Step 11: Start Using It

Try these:

> Create a LinkedIn post: Hello world! This is my first automated post.

> Show my LinkedIn profile

> Schedule a post for tomorrow at 10am: Excited about the week ahead!

If you set up Medium:

> Write a Medium article about getting started with MCP and save it as a draft

See [Tools Reference](Tools-Reference.md) for everything you can do, and [Automation Recipes](Automation-Recipes.md) for advanced workflows.

## Quick Verification Checklist

- [ ] `node --version` shows v20+
- [ ] `npm run build` completes without errors
- [ ] `.env` has `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`
- [ ] `claude_desktop_config.json` has the linkedin MCP server entry
- [ ] Claude Desktop shows the hammer icon after restart
- [ ] "Authenticate with LinkedIn" opens the browser and succeeds
- [ ] "Show my LinkedIn profile" returns your name
- [ ] (Optional) Telegram bot sends you a notification on authentication
- [ ] (Optional) "Show my Medium profile" returns your username
