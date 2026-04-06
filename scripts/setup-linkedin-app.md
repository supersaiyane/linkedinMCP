# LinkedIn Developer App Setup (Personal Profile)

This MCP server posts to **your personal LinkedIn profile**, not a company page.

## Steps

1. Go to https://www.linkedin.com/developers/apps
2. Click "Create app"
3. Fill in:
   - **App name:** anything (e.g., "My LinkedIn MCP")
   - **LinkedIn Page:** LinkedIn requires you to associate a Page, but this is only for app verification — **posts will go to your personal profile**, not the Page. If you don't have a Page, create a placeholder one.
   - **App logo:** any image
4. After creation, go to the **"Auth"** tab
5. Under "OAuth 2.0 settings", add redirect URL: `http://localhost:3456/callback`
6. Go to the **"Products"** tab and request access to:
   - **Share on LinkedIn** — grants `w_member_social` (required for posting as yourself)
   - **Sign In with LinkedIn using OpenID Connect** — grants `openid`, `profile` (required for reading your profile)
7. Wait for approval (usually instant for "Share on LinkedIn")
8. Go back to the **"Auth"** tab and copy:
   - **Client ID** → set as `LINKEDIN_CLIENT_ID`
   - **Primary Client Secret** → set as `LINKEDIN_CLIENT_SECRET`

## How it works

- When you authenticate, you log in with **your personal LinkedIn account**
- The `w_member_social` scope lets the app post **on behalf of you** (the person who authorized it)
- The LinkedIn Page you associated with the app is irrelevant to posting — it's just a LinkedIn requirement for creating developer apps
- All posts appear on your personal feed as if you wrote them yourself

## Important notes

- The "Share on LinkedIn" product is **required**. Without it, the `w_member_social` scope won't be available and posts will fail with 403.
- If you want to post to a company page instead, you would need the `w_organization_social` scope and a different API flow (not currently supported by this MCP server).
