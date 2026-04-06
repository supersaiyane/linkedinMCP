---
title: Authentication
sidebar_label: Authentication
sidebar_position: 6
audience: L1-L5
---

# Authentication

**TL;DR:** The server uses OAuth 2.0 Authorization Code flow to connect to LinkedIn. On first use, it opens your browser, you log in and approve access, and the server stores encrypted tokens that auto-refresh for up to a year. No manual token management required after initial setup.

**Prerequisite knowledge:** A LinkedIn developer app with "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect" products approved ([LinkedIn App Setup](LinkedIn-App-Setup)). Basic understanding of what OAuth does (granting an app permission to act on your behalf).

---

## How OAuth 2.0 Works (Analogy)

Think of OAuth 2.0 like getting a hotel key card:

1. **You (the user)** walk up to the front desk (LinkedIn's login page) and show your ID (your LinkedIn username and password)
2. **The front desk (LinkedIn)** verifies your identity and asks: "This app wants to post on your behalf and read your profile. Allow?" You say yes.
3. **The front desk gives a temporary code** to the bellhop (the callback server), who brings it back to the app
4. **The app exchanges the code** for a key card (access token) that opens specific doors (post, read profile) but not others (delete account, read messages)
5. **The key card expires** after 60 days, but the app also received a master override (refresh token) that can request a new key card for up to 365 days
6. **After 365 days**, you need to visit the front desk again (re-authenticate)

The server manages steps 2-6 automatically. You only see step 1 (the browser login) once per year.

---

## The Complete OAuth Flow

### Step-by-Step

When you invoke `linkedin_authenticate` (or any tool that requires authentication), this sequence runs:

**1. Auth URL generation**

The server constructs a LinkedIn authorization URL:

```
https://www.linkedin.com/oauth/v2/authorization
  ?response_type=code
  &client_id=<LINKEDIN_CLIENT_ID>
  &redirect_uri=http://localhost:3456/callback
  &scope=openid profile w_member_social
  &state=<RANDOM_UUID>
```

The `state` parameter is a random UUID generated per request. It prevents CSRF attacks by ensuring the callback originated from a request this server initiated.

**2. Browser opens**

The server uses the `open` package to launch your default browser with the authorization URL. If the browser fails to open (common in headless or remote environments), the URL is returned as text so you can copy and paste it manually.

**3. User authorizes**

You log into LinkedIn (if not already logged in) and see a consent screen listing the permissions the app is requesting:

- `openid` -- Verify your identity
- `profile` -- Read your name and profile picture
- `w_member_social` -- Create posts and articles on your behalf

You click "Allow."

**4. LinkedIn redirects to callback server**

LinkedIn redirects your browser to `http://localhost:3456/callback?code=<AUTH_CODE>&state=<STATE>`.

The server runs a temporary HTTP server on port 3456 that:

- Validates the `state` parameter matches the one generated in step 1
- Captures the authorization `code`
- Displays "LinkedIn Connected! You can close this window." in the browser
- Auto-closes after receiving the callback (120-second timeout if no callback arrives)

**5. Code exchange**

The server exchanges the authorization code for tokens by sending a POST request to LinkedIn's token endpoint:

```
POST https://www.linkedin.com/oauth/v2/accessToken
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=<AUTH_CODE>
&client_id=<LINKEDIN_CLIENT_ID>
&client_secret=<LINKEDIN_CLIENT_SECRET>
&redirect_uri=http://localhost:3456/callback
```

The Content-Type is `application/x-www-form-urlencoded`, not JSON. This is a common source of errors when implementing LinkedIn OAuth manually.

**6. LinkedIn returns tokens**

```json
{
  "access_token": "AQV...",
  "expires_in": 5184000,
  "refresh_token": "AQX...",
  "refresh_token_expires_in": 31536000,
  "scope": "openid,profile,w_member_social"
}
```

**7. Token storage**

The tokens are encrypted with AES-256-GCM and written to `data/tokens.enc` (or held in memory if using `EnvTokenStore`). See the [Token Encryption](#token-encryption) section below for details.

**8. Profile fetch**

The server fetches your LinkedIn profile using the new access token to confirm authentication succeeded. Your member URN (`urn:li:person:{sub}`) is cached for use in subsequent API calls.

---

## Token Lifecycle

### Access Token

- **Duration:** 60 days (5,184,000 seconds)
- **Purpose:** Included as a `Bearer` token in every LinkedIn API request
- **Auto-refresh:** When `getValidToken()` detects the access token will expire within 60 seconds, it transparently requests a new one using the refresh token. The caller never sees the refresh happen.

### Refresh Token

- **Duration:** 365 days (31,536,000 seconds)
- **Purpose:** Used to obtain a new access token without requiring the user to log in again
- **Refresh request format:**

```
POST https://www.linkedin.com/oauth/v2/accessToken
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=<REFRESH_TOKEN>
&client_id=<LINKEDIN_CLIENT_ID>
&client_secret=<LINKEDIN_CLIENT_SECRET>
```

### Auto-Refresh Logic

Every time a tool needs to call the LinkedIn API, this sequence runs inside `AuthManager.getValidToken()`:

1. Load the stored token from the token store
2. If no token exists, throw `AuthenticationError` ("Not authenticated. Call linkedin_authenticate first.")
3. Check if the access token expires within the next 60 seconds
4. If not expired, return the token as-is
5. If expired, send a refresh request to LinkedIn
6. If refresh succeeds, save the new token and return it
7. If refresh fails with any error, delete the stored token and throw `TokenRefreshError` (the user must re-authenticate)

The 60-second buffer in step 3 prevents edge cases where the token expires between validation and the API call arriving at LinkedIn's servers.

### When Re-Authentication is Required

Full re-authentication (browser login) is needed when:

- No token file exists (first use or after deletion)
- The refresh token has expired (after approximately 365 days)
- The refresh token was revoked (user removed app access in LinkedIn settings)
- The token file is corrupted or the encryption key changed
- LinkedIn's OAuth configuration changed (rare)

---

## Token Encryption

### Algorithm: AES-256-GCM

The server uses AES-256-GCM (Galois/Counter Mode), an authenticated encryption algorithm that provides both confidentiality (data is unreadable without the key) and integrity (any tampering is detected).

### Key Derivation

The `TOKEN_ENCRYPTION_KEY` environment variable (minimum 32 characters) is hashed with SHA-256 to produce exactly 32 bytes (256 bits):

```typescript
const derivedKey = crypto.createHash("sha256").update(key).digest();
```

This means the actual encryption key is deterministic given the environment variable, but is always exactly the right length regardless of the input length.

### Encryption Process (on save)

1. Serialize the `OAuthToken` object to JSON
2. Generate 16 random bytes for the initialization vector (IV)
3. Create an AES-256-GCM cipher with the derived key and IV
4. Encrypt the JSON string, producing hex-encoded ciphertext
5. Extract the 16-byte authentication tag
6. Write a JSON file containing `{ iv, tag, data }` (all hex-encoded)
7. Set file permissions to `0o600` (owner read/write only)

### Decryption Process (on load)

1. Read and parse the JSON file to extract `{ iv, tag, data }`
2. Derive the key from `TOKEN_ENCRYPTION_KEY` using SHA-256
3. Create an AES-256-GCM decipher with the derived key and IV
4. Set the authentication tag (if the tag does not match, decryption fails with a clear error)
5. Decrypt the ciphertext to recover the JSON string
6. Parse the JSON and validate against the `OAuthTokenSchema` Zod schema
7. Return the typed `OAuthToken` object

### File Format on Disk

`data/tokens.enc` contains:

```json
{
  "iv": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  "tag": "1234567890abcdef1234567890abcdef",
  "data": "encrypted_hex_string_here..."
}
```

A fresh random IV is generated on every save, so the same token data produces different ciphertext each time. This prevents attackers from detecting when tokens have been refreshed by comparing file contents.

---

## Two Token Stores

### FileTokenStore (Default)

- **When to use:** Local development, personal Claude Desktop usage, any environment where the server has filesystem access
- **How it works:** Encrypts tokens with AES-256-GCM and writes them to the configured file path
- **File location:** Controlled by `TOKEN_STORE_PATH` (default: `./data/tokens.enc`)
- **Persistence:** Tokens survive server restarts
- **Operations:** `load()` decrypts and returns the token or null if the file does not exist. `save()` encrypts and writes. `delete()` removes the file.
- **Directory creation:** The parent directory (e.g., `data/`) is created automatically with `0o700` permissions if it does not exist

### EnvTokenStore (CI/CD)

- **When to use:** CI/CD pipelines, Docker containers, headless environments where browser-based OAuth is not possible
- **How it works:** Reads `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_REFRESH_TOKEN` from environment variables
- **Activation:** Set `TOKEN_STORE_TYPE=env` in configuration
- **Read-only:** `save()` and `delete()` are no-ops. Token refresh happens in memory but is not persisted -- the environment variables are the source of truth
- **Token acquisition:** You must obtain the access and refresh tokens through another method (e.g., running the server locally once with `FileTokenStore`, then copying the decrypted values)

---

## Security Considerations

### File Permissions

The token file is created with `0o600` permissions (read/write for owner only). The data directory is created with `0o700` (read/write/execute for owner only). On multi-user systems, this prevents other users from reading the encrypted tokens.

### State Parameter (CSRF Prevention)

Every authentication request generates a random UUID as the `state` parameter. When the callback arrives, the server rejects any request where the state does not match. This prevents an attacker from tricking the server into accepting a callback from a different authorization flow.

### Callback Server Auto-Close

The temporary HTTP server on port 3456 has a 120-second timeout. After receiving a callback (success or failure), the server closes immediately. This minimizes the window during which the port is open and listening. If no callback arrives within 120 seconds, the server closes and the authentication attempt fails.

### Token Logging

Tokens are never logged, even at `debug` log level. The `AuthManager` logs events like "Token refreshed successfully" and "Access token expired, refreshing..." but never includes the token value in the log message.

### Encryption Key Management

The default `TOKEN_ENCRYPTION_KEY` value (`CHANGE_ME_IN_PRODUCTION_32CHARS!!`) is intentionally insecure to make it obvious that it must be replaced. If you change the encryption key after tokens have been stored, the existing token file becomes unreadable and must be deleted (triggering re-authentication).

---

## Key Takeaways

- Authentication requires a one-time browser login. After that, the server manages token refresh automatically for up to 365 days.
- The access token (60-day lifetime) is refreshed transparently before it expires. The refresh token (365-day lifetime) requires re-authentication when it expires.
- Tokens are encrypted at rest with AES-256-GCM. A fresh IV is generated on every save.
- The callback server is temporary and auto-closes after use. The state parameter prevents CSRF attacks.
- For CI/CD environments, use `TOKEN_STORE_TYPE=env` with pre-obtained tokens instead of browser-based OAuth.

## Related Pages

- [LinkedIn App Setup](LinkedIn-App-Setup) -- Creating the LinkedIn developer app and obtaining credentials
- [Configuration](Configuration) -- Environment variable reference including token store settings
- [Architecture](Architecture) -- How the auth system fits into the overall server design
- [Troubleshooting](Troubleshooting) -- Common authentication errors and fixes
