# Telegram Notifications Setup

Get instant Telegram notifications on your phone whenever the MCP server does something -- posts published, scheduled posts firing, errors, and more.

**Time to set up:** 2 minutes

## Why Telegram?

- **Free** -- no limits, no paid tiers
- **Secure** -- official Bot API, encrypted, no third-party middlemen
- **Instant** -- push notifications to your phone
- **Private** -- only you receive messages from your bot

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a **name** for your bot (e.g., "My LinkedIn Notifier")
4. Choose a **username** (must end in `bot`, e.g., `my_linkedin_notifier_bot`)
5. BotFather replies with your **bot token** -- copy it

It looks like: `7123456789:AAH1bGciOiJSUzI1NiIsInR5cCI6...`

## Step 2: Get Your Chat ID

1. Open a chat with your new bot in Telegram
2. Send it any message (e.g., "hello")
3. Open this URL in your browser (replace `<TOKEN>` with your bot token):
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
4. In the JSON response, find `"chat":{"id":123456789}` -- that number is your **chat ID**

Example response:
```json
{
  "result": [{
    "message": {
      "chat": {
        "id": 123456789,
        "first_name": "Gurpreet",
        "type": "private"
      },
      "text": "hello"
    }
  }]
}
```

Your chat ID is `123456789`.

## Step 3: Configure

Add to your `.env` file:

```bash
TELEGRAM_BOT_TOKEN=7123456789:AAH1bGciOiJSUzI1NiIsInR5cCI6...
TELEGRAM_CHAT_ID=123456789
```

Or in Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/path/to/linkedinMCP/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "...",
        "LINKEDIN_CLIENT_SECRET": "...",
        "TELEGRAM_BOT_TOKEN": "your_bot_token",
        "TELEGRAM_CHAT_ID": "your_chat_id"
      }
    }
  }
}
```

## Step 4: Restart Claude Desktop

Quit and reopen Claude Desktop. The server logs will show "Telegram notifications enabled" on startup.

## What You'll Get Notified About

| Event | Example Message |
|-------|-----------------|
| LinkedIn post published | **LinkedIn Post Published** "Just shipped v2.0..." [View Post](url) |
| LinkedIn article published | **LinkedIn Article Published** Getting Started with MCP [View Post](url) |
| Scheduled post published | **Scheduled Post Published** "Weekly update..." [View Post](url) |
| Scheduled post failed (after 3 retries) | **Scheduled Post Failed** ID: abc123 Error: Rate limit exceeded |
| Medium article published | **Medium Article Published** AI in 2026 [Read Article](url) |
| LinkedIn authentication completed | **LinkedIn Connected** Authenticated as Gurpreet Singh |

## Notifications Are Best-Effort

Telegram notifications never block the main operation. If a notification fails to send (network issue, invalid token), the MCP tool still completes normally. A warning is logged but the tool returns success.

## Troubleshooting

### No notifications arriving

1. **Did you message your bot first?** You must send at least one message to the bot before it can send to you.
2. **Check your chat ID.** Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` again after messaging the bot.
3. **Check the bot token.** Make sure you copied the full token including the colon.
4. **Restart Claude Desktop** after changing env vars.

### "Telegram notification failed" in logs

The bot token or chat ID is wrong. Double-check both values.

### Can I send notifications to a group?

Yes. Add the bot to a group, send a message in the group, then use the group's chat ID (it will be negative, e.g., `-987654321`).
