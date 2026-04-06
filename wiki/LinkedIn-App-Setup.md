# LinkedIn Developer App Setup

This guide walks you through creating a LinkedIn developer app. You need this to get the Client ID and Client Secret that the MCP server uses for OAuth authentication.

## Important: Personal Profile, Not Company Page

This MCP server posts to **your personal LinkedIn profile**. LinkedIn requires you to associate a Page when creating a developer app, but that Page has nothing to do with where your posts appear. Posts always go to the personal feed of whoever authorizes the app.

## Step-by-Step

### 1. Go to LinkedIn Developer Portal

Navigate to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) and sign in with your LinkedIn account.

### 2. Create a New App

Click **"Create app"** and fill in:

| Field | What to Enter |
|-------|---------------|
| **App name** | Anything you want (e.g., "My LinkedIn MCP") |
| **LinkedIn Page** | Select any Page you manage, or create a placeholder. This does NOT affect posting. |
| **App logo** | Upload any image (required but cosmetic) |
| **Legal agreement** | Check the box |

Click **"Create app"**.

### 3. Add Redirect URL

1. Go to the **"Auth"** tab
2. Under **"OAuth 2.0 settings"**, find **"Authorized redirect URLs for your app"**
3. Click **"Add redirect URL"**
4. Enter: `http://localhost:3456/callback`
5. Click **"Add"** then **"Update"**

This is where LinkedIn sends you back after you authorize. The MCP server listens on port 3456 temporarily during authentication.

### 4. Request Product Access

Go to the **"Products"** tab and request access to these two products:

| Product | What It Grants | Why You Need It |
|---------|----------------|-----------------|
| **Share on LinkedIn** | `w_member_social` scope | Required for creating posts, articles, uploading media |
| **Sign In with LinkedIn using OpenID Connect** | `openid`, `profile` scopes | Required for reading your profile info and getting your member URN |

Click **"Request access"** for each one.

- **Share on LinkedIn** is usually approved instantly
- **Sign In with LinkedIn** is usually approved instantly

You'll see them listed under "Added products" once approved.

### 5. Copy Your Credentials

Go back to the **"Auth"** tab:

| Field | Where It Goes |
|-------|---------------|
| **Client ID** | `LINKEDIN_CLIENT_ID` in your `.env` or Claude Desktop config |
| **Primary Client Secret** | `LINKEDIN_CLIENT_SECRET` in your `.env` or Claude Desktop config |

Click **"Show"** next to the Client Secret to reveal it, then copy.

## Verification

After setup, your Auth tab should show:

- **OAuth 2.0 scopes**: `openid`, `profile`, `w_member_social`
- **Authorized redirect URLs**: `http://localhost:3456/callback`

## Common Issues

### "w_member_social scope not available"

You haven't been approved for the "Share on LinkedIn" product. Go to Products tab and request it.

### "Invalid redirect URI"

The redirect URL in your app settings must match **exactly**: `http://localhost:3456/callback`. No trailing slash, no https.

### "App requires LinkedIn Page"

Create a quick placeholder LinkedIn Page (Settings > Create a Page). It won't affect your personal posting.

### "Client Secret not showing"

You may need to verify your identity (email/phone) before LinkedIn reveals the secret. Check for a verification prompt.

## Security Notes

- Keep your Client Secret private. Never commit it to git.
- The Client ID is not sensitive -- it's sent in URLs during OAuth.
- If your Client Secret is compromised, go to the Auth tab and click "Reset" to generate a new one. You'll need to update your config and re-authenticate.
