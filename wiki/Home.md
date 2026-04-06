# LinkedIn MCP Server Wiki

Welcome to the LinkedIn MCP Server wiki. This MCP server connects Claude Desktop to your personal LinkedIn and Medium accounts, with optional Telegram notifications for everything.

## Quick Navigation

| Page | Description |
|------|-------------|
| [Getting Started](Getting-Started.md) | Prerequisites, installation, and first-time setup |
| [LinkedIn App Setup](LinkedIn-App-Setup.md) | Step-by-step guide to creating your LinkedIn developer app |
| [Configuration](Configuration.md) | All environment variables and config options explained |
| [Telegram Setup](Telegram-Setup.md) | Set up Telegram notifications (2 minutes) |
| [Medium Setup](Medium-Setup.md) | Set up Medium article publishing |
| [Tools Reference](Tools-Reference.md) | Complete reference for all 9 MCP tools |
| [Automation Recipes](Automation-Recipes.md) | Ready-to-use workflows and prompt templates |
| [Architecture](Architecture.md) | How the server works under the hood |
| [Troubleshooting](Troubleshooting.md) | Common errors and how to fix them |
| [FAQ](FAQ.md) | Frequently asked questions |
| [Contributing](Contributing.md) | How to contribute to the project |

## What This Server Does

Once connected to Claude Desktop, you can:

- **Create posts** on your personal LinkedIn feed
- **Publish articles** with titles, descriptions, and cover images
- **Upload images** for use in posts
- **View your profile** info and URN
- **Schedule posts** for future publication
- **List scheduled posts** and check their status
- **Publish articles on Medium** with markdown/HTML, tags, and draft/public modes
- **Get Telegram notifications** when posts publish, fail, or authenticate

All through natural language -- just chat with Claude.

## How It Works

```
You (Claude Desktop) --> Claude AI --> MCP Protocol --> LinkedIn MCP Server --> LinkedIn API
                                                                |           --> Medium API
                                                                |           --> Telegram Bot API
```

1. You type a request in Claude Desktop (e.g., "Post about AI on LinkedIn")
2. Claude decides which MCP tool to call
3. The MCP server handles OAuth, formatting, rate limiting, and API calls
4. LinkedIn publishes the content
5. Claude confirms with a link to your post
