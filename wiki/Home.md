---
title: AmplifyrMCP Wiki
sidebar_label: Home
sidebar_position: 0
audience: L1-L5
---

# AmplifyrMCP Wiki

An MCP server that connects Claude Desktop to LinkedIn, Medium, and Telegram through natural language.

**TL;DR:** Install the server, add your LinkedIn credentials, restart Claude Desktop, and start posting to LinkedIn by chatting with Claude. Optional Medium publishing and Telegram notifications are available with minimal extra configuration.

**Prerequisite knowledge:** None. Start with [Concepts](Concepts) if MCP is new to you.

---

## What This Server Does

The AmplifyrMCP turns Claude Desktop into a LinkedIn content management tool. Once connected, you can:

- Create text posts on your LinkedIn feed with hashtags and visibility controls
- Publish articles with titles, descriptions, and cover images
- Upload images for use in posts
- View your LinkedIn profile data and URN
- Schedule posts for future publication with automatic retry on failure
- Publish articles to Medium with markdown/HTML, tags, and draft/public modes
- Receive Telegram notifications when posts publish, fail, or authenticate

All interactions happen through natural language in Claude Desktop. No command-line usage required after initial setup.

```
You (Claude Desktop) --> Claude AI --> MCP Protocol --> AmplifyrMCP --> LinkedIn API
                                                                |           --> Medium API
                                                                |           --> Telegram Bot API
```

---

### Getting Started

- [Concepts](Concepts) -- What MCP is, what this server does, and core terminology
- [Installation](Installation) -- System requirements and three ways to install
- [Quick-Start-Guide](Quick-Start-Guide) -- Zero to first LinkedIn post in 10 steps
- [Configuration](Configuration) -- All environment variables and config options

### Architecture

- [Architecture](Architecture) -- Component diagram, data flow, and design decisions
- [Authentication](Authentication) -- OAuth 2.0 flow, token lifecycle, and encryption

### Integrations

- [LinkedIn-App-Setup](LinkedIn-App-Setup) -- Create your LinkedIn developer app and get credentials
- [Telegram-Setup](Telegram-Setup) -- Set up Telegram notifications (2 minutes)
- [Medium-Setup](Medium-Setup) -- Set up Medium article publishing (1 minute)

### Tools and Automation

- [Tools-Reference](Tools-Reference) -- Complete reference for all 9 MCP tools
- [Automation-Recipes](Automation-Recipes) -- Ready-to-use workflows and prompt templates

### Operations

- [Docker-Deployment](Docker-Deployment) -- Run the server in a container
- [Troubleshooting](Troubleshooting) -- Common errors and how to fix them

### Development

- [Contributing](Contributing) -- How to contribute to the project

### Reference

- [Glossary](Glossary) -- Definitions for terms used across this wiki
- [FAQ](FAQ) -- Frequently asked questions

---

## Key Takeaways

- This wiki covers setup, usage, architecture, and troubleshooting for the AmplifyrMCP.
- Start with [Concepts](Concepts) if you are new to MCP, then follow [Installation](Installation) and [Quick-Start-Guide](Quick-Start-Guide).
- The [Tools-Reference](Tools-Reference) is the definitive guide to what you can ask Claude to do once the server is running.

## Related Pages

- [Concepts](Concepts) -- Recommended starting point for new users
- [Quick-Start-Guide](Quick-Start-Guide) -- Fastest path to a working setup
- [FAQ](FAQ) -- Answers to common questions
