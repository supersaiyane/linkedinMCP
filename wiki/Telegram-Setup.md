---
title: Telegram Notifications Setup
sidebar_label: Telegram Setup
sidebar_position: 8
audience: L1-L2
---

# Telegram Notifications Setup

**TL;DR:** Create a Telegram bot via @BotFather, get the bot token and your chat ID, and add them to your environment config. You will receive push notifications whenever the MCP server publishes a post, article, or scheduled item -- or when something fails.

**Prerequisite knowledge:**

- A Telegram account with the Telegram app installed (mobile or desktop)
- Familiarity with environment variables or the Claude Desktop config file
- The LinkedIn MCP server installed and running (see [Getting Started](Getting-Started))

---

## What This Does (L1)

The MCP server can send you real-time Telegram messages whenever it completes an action: publishing a LinkedIn post, firing a scheduled post, publishing a Medium article, or encountering an error. Notifications are delivered through a Telegram bot that you own and control.

Telegram notifications are entirely optional. If the environment variables are not set, the server operates normally without sending any notifications.

---

## Step-by-Step Setup (L2)

### Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather** (the official Telegram bot for creating bots)
2. Send the command `/newbot`
3. Choose a display **name** for your bot (e.g., `LinkedIn MCP Notifier`)
4. Choose a **username** that ends in `bot` (e.g., `my_linkedin_mcp_bot`)
5. BotFather replies with your **bot token**

The token looks like this:

```
7123456789:AAH1bGciOiJSUzI1NiIsInR5cCI6Ikt
```

Copy and save this token. You will need it in Step 3.

### Step 2: Get Your Chat ID

1. Open a conversation with your new bot in Telegram
2. Send any message to the bot (e.g., `hello`)
3. Open the following URL in your browser, replacing `<BOT_TOKEN>` with the token from Step 1:

   ```
   https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
   ```

4. The response is a JSON object. Locate the `chat.id` field:

   ```json
   {
     "ok": true,
     "result": [
       {
         "update_id": 123456789,
         "message": {
           "message_id": 1,
           "from": {
             "id": 987654321,
             "first_name": "Gurpreet"
           },
           "chat": {
             "id": 987654321,
             "first_name": "Gurpreet",
             "type": "private"
           },
           "text": "hello"
         }
       }
     ]
   }
   ```

5. The value at `result[0].message.chat.id` is your **chat ID**. In this example, it is `987654321`.

If `result` is an empty array, you have not yet sent a message to the bot. Go back to Telegram, send a message, and reload the URL.

### Step 3: Configure Environment Variables

Add both values to your `.env` file:

```bash
TELEGRAM_BOT_TOKEN=<BOT_TOKEN>
TELEGRAM_CHAT_ID=<CHAT_ID>
```

Or in the Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/path/to/amplifyr-mcp/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "<LINKEDIN_CLIENT_ID>",
        "LINKEDIN_CLIENT_SECRET": "<LINKEDIN_CLIENT_SECRET>",
        "TELEGRAM_BOT_TOKEN": "<BOT_TOKEN>",
        "TELEGRAM_CHAT_ID": "<CHAT_ID>"
      }
    }
  }
}
```

### Step 4: Restart the Server

Quit and reopen Claude Desktop (or restart the MCP server if running standalone). The server logs will show the following on startup:

```
Telegram notifications enabled
```

If you do not see this message, double-check that both environment variables are set.

---

## What Gets Notified

| Event | Example Notification |
|-------|---------------------|
| LinkedIn post published | **LinkedIn Post Published** -- "Excited to announce v2.0..." [View Post](https://linkedin.com/...) |
| LinkedIn article published | **LinkedIn Article Published** -- Getting Started with MCP [View Post](https://linkedin.com/...) |
| Scheduled post published | **Scheduled Post Published** -- "Weekly update: we shipped 3 features..." [View Post](https://linkedin.com/...) |
| Scheduled post failed (after 3 retries) | **Scheduled Post Failed** -- ID: a1b2c3d4 -- Error: Rate limit exceeded |
| Medium article published | **Medium Article Published** -- AI in 2026 [Read Article](https://medium.com/...) |
| LinkedIn authentication completed | **LinkedIn Connected** -- Authenticated as Gurpreet Singh |

---

## How It Works (L3)

### Best-Effort Delivery

Telegram notifications never block the main operation. The notification call runs after the primary action (posting, scheduling, etc.) has already completed. If a notification fails to send due to a network issue, an invalid token, or any other reason:

- The MCP tool still returns success to the user
- A warning is logged to stderr
- No retry is attempted for the notification itself

This design ensures that a Telegram outage or misconfiguration does not prevent you from using the server's core features.

### Message Format

Notifications are sent as plain text via the Telegram Bot API's `sendMessage` endpoint. Links are included inline. Messages are concise: typically 2-3 lines with the event type, a summary, and a link to the result.

---

## Troubleshooting

### No notifications arriving

Work through these checks in order:

1. **Did you message the bot first?** Telegram bots cannot initiate conversations. You must send at least one message to the bot before it can message you back.
2. **Verify the chat ID.** Visit `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` after sending a message to the bot. Confirm the `chat.id` matches what you configured.
3. **Verify the bot token.** Make sure the full token is copied, including the colon separator (e.g., `7123456789:AAH1bGci...`).
4. **Restart the server.** Environment variable changes require a restart of Claude Desktop or the MCP server process.
5. **Check server logs.** Look for `Telegram notification failed` warnings in stderr output.

### "Telegram notification failed" in logs

The bot token or chat ID is incorrect. The most common causes:

- Token was partially copied (missing characters after the colon)
- Chat ID belongs to a different bot or conversation
- The bot was deleted or the token was revoked via @BotFather

Regenerate the token with `/revoke` in @BotFather if needed, then update your config.

### Sending notifications to a group chat

1. Add the bot to the target group
2. Send a message in the group (any group member can do this)
3. Call the `getUpdates` URL and look for the group's chat ID
4. Group chat IDs are negative numbers (e.g., `-987654321`)
5. Set `TELEGRAM_CHAT_ID` to the negative number, including the minus sign

---

## Key Takeaways

- Telegram notifications are optional and best-effort -- they never interfere with the server's primary operations.
- You must message the bot first before it can send notifications to you.
- The chat ID for private chats is a positive integer; for group chats it is a negative integer.
- Both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` must be set for notifications to activate.

## Related Pages

- [Getting Started](Getting-Started) -- initial server setup
- [Configuration](Configuration) -- full environment variable reference
- [Tools Reference](Tools-Reference) -- tools that trigger notifications
- [Medium Setup](Medium-Setup) -- Medium article notifications also go through Telegram
- [Troubleshooting](Troubleshooting) -- additional debugging guidance
