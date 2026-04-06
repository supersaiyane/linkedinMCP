---
title: LinkedIn Developer App Setup
sidebar_label: LinkedIn App Setup
sidebar_position: 7
audience: L1-L2
---

# LinkedIn Developer App Setup

**TL;DR:** Create a LinkedIn developer app to get a Client ID and Client Secret. These credentials let the MCP server authenticate with LinkedIn on your behalf. The entire process takes about 5 minutes and requires no coding.

**Prerequisite knowledge:**

- A LinkedIn account (personal, not a company account)
- Basic familiarity with environment variables or the Claude Desktop config file
- Completion of the [Getting Started](Getting-Started) guide (or intent to complete it next)

---

## What This Does (L1)

The LinkedIn MCP server needs permission to post on your behalf. LinkedIn uses OAuth 2.0 for this: you create a "developer app" in LinkedIn's portal, which gives you two credentials (Client ID and Client Secret). The MCP server uses these credentials to request authorization from you through a browser-based login flow.

**Posts go to your personal LinkedIn profile, not a company page.** LinkedIn requires you to associate a Page when creating a developer app, but that Page has nothing to do with where your posts appear. Every post, article, and media upload goes to the personal feed of whoever authorizes the app.

---

## Step-by-Step Setup (L2)

### 1. Open the LinkedIn Developer Portal

Navigate to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) and sign in with your LinkedIn account.

### 2. Create a New App

Click **"Create app"** and fill in the following fields:

| Field | What to Enter |
|-------|---------------|
| **App name** | Any descriptive name (e.g., `My LinkedIn MCP`) |
| **LinkedIn Page** | Select any Page you manage. If you do not have one, create a placeholder Page first. This does NOT affect where posts appear. |
| **App logo** | Upload any image. This is required but cosmetic. |
| **Legal agreement** | Check the box to accept terms. |

Click **"Create app"**.

### 3. Add the Redirect URL

1. Go to the **"Auth"** tab in your new app
2. Under **"OAuth 2.0 settings"**, find **"Authorized redirect URLs for your app"**
3. Click **"Add redirect URL"**
4. Enter exactly:
   ```
   http://localhost:3456/callback
   ```
5. Click **"Add"**, then click **"Update"**

This URL is where LinkedIn sends the browser after you approve the authorization request. The MCP server starts a temporary local server on port 3456 to receive it.

### 4. Request Product Access

Go to the **"Products"** tab. Request access to both of these products:

| Product | Scopes Granted | Purpose |
|---------|---------------|---------|
| **Share on LinkedIn** | `w_member_social` | Required for creating posts, publishing articles, and uploading media |
| **Sign In with LinkedIn using OpenID Connect** | `openid`, `profile` | Required for reading your profile info and obtaining your member URN |

Click **"Request access"** for each one. Both products are typically approved within seconds. Once approved, they appear under "Added products" on the same tab.

### 5. Copy Your Credentials

Return to the **"Auth"** tab and locate:

| Field | Where to Put It |
|-------|-----------------|
| **Client ID** | Set as `LINKEDIN_CLIENT_ID` in your `.env` file or Claude Desktop config |
| **Primary Client Secret** | Set as `LINKEDIN_CLIENT_SECRET` in your `.env` file or Claude Desktop config |

Click **"Show"** next to the Client Secret to reveal it, then copy the full value.

### 6. Verify Your Configuration

After completing all steps, your Auth tab should display:

```
OAuth 2.0 scopes: openid, profile, w_member_social
Authorized redirect URLs: http://localhost:3456/callback
```

If either is missing, revisit the relevant step above.

---

## Troubleshooting

### "w_member_social scope not available"

The "Share on LinkedIn" product has not been approved for your app. Go to the Products tab, confirm you requested it, and wait for approval. If it shows "Review in progress" for more than 24 hours, check that your LinkedIn Page meets LinkedIn's minimum requirements (a Page name, logo, and at least one admin).

### "Invalid redirect URI" during authentication

The redirect URL configured in your app must match the MCP server's expected URL character-for-character. Verify:

- The URL is `http://localhost:3456/callback` (not `https`)
- There is no trailing slash after `callback`
- There are no extra spaces or encoded characters

If you changed `LINKEDIN_REDIRECT_URI` in your environment config, the app's redirect URL must match that value instead.

### "App requires a LinkedIn Page"

LinkedIn requires every developer app to be associated with a Page. If you do not manage any Pages:

1. Go to LinkedIn homepage
2. Click "For Business" (or navigate to Settings)
3. Create a Page (Company type works fine)
4. Return to the developer portal and associate the new Page with your app

The Page is only an administrative requirement. It does not receive your posts.

### Client Secret not showing

LinkedIn may require identity verification (email or phone) before revealing the Client Secret. Look for a verification prompt at the top of the Auth tab or in your LinkedIn notifications.

---

## Security Considerations

- **Keep the Client Secret private.** Never commit it to version control or share it publicly.
- **The Client ID is not sensitive.** It is included in OAuth URLs and visible to the user during the browser-based authorization flow.
- **If the Client Secret is compromised:** Go to the Auth tab, click "Reset" to generate a new secret. Update your configuration and re-authenticate through the MCP server.
- **Rotate credentials periodically** if your security policy requires it. Resetting the secret invalidates all existing tokens, so you will need to re-authenticate afterward.

---

## Key Takeaways

- You need two products enabled: "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect."
- The redirect URL must be exactly `http://localhost:3456/callback` (no HTTPS, no trailing slash).
- Posts always go to your personal profile regardless of which LinkedIn Page is associated with the app.
- The Client Secret must stay out of source control and public repositories.

## Related Pages

- [Getting Started](Getting-Started) -- initial server setup and configuration
- [Configuration](Configuration) -- environment variable reference including `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`
- [Tools Reference](Tools-Reference) -- the `linkedin_authenticate` tool that uses these credentials
- [Troubleshooting](Troubleshooting) -- additional debugging guidance
