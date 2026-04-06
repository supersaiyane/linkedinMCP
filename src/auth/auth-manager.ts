import axios from "axios";
import type { Logger } from "pino";
import { LINKEDIN_API } from "../config/linkedin-api.js";
import { LinkedInTokenResponseSchema } from "../models/schemas.js";
import type { OAuthToken } from "../models/types.js";
import {
  AuthenticationError,
  TokenRefreshError,
} from "../models/errors.js";
import { generateId } from "../utils/id.js";
import type { TokenStore } from "./token-store.js";
import { startCallbackServer } from "./callback-server.js";

export class AuthManager {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
    private tokenStore: TokenStore,
    private logger: Logger,
  ) {}

  async getValidToken(): Promise<OAuthToken> {
    const token = await this.tokenStore.load();
    if (!token) {
      throw new AuthenticationError(
        "Not authenticated. Call linkedin_authenticate first.",
      );
    }
    if (this.isExpired(token)) {
      this.logger.info("Access token expired, refreshing...");
      return this.refreshAccessToken(token.refreshToken);
    }
    return token;
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getValidToken();
      return true;
    } catch {
      return false;
    }
  }

  generateAuthUrl(): { url: string; state: string } {
    const state = generateId();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: LINKEDIN_API.SCOPES.join(" "),
      state,
    });
    return {
      url: `${LINKEDIN_API.AUTH_URL}?${params.toString()}`,
      state,
    };
  }

  async authenticate(
    openBrowser: (url: string) => Promise<void>,
  ): Promise<OAuthToken> {
    const { url, state } = this.generateAuthUrl();
    const callbackPort = LINKEDIN_API.CALLBACK_PORT;

    const { promise, close } = startCallbackServer(
      callbackPort,
      state,
      this.logger,
    );

    try {
      await openBrowser(url);
    } catch {
      this.logger.warn("Could not open browser automatically");
    }

    try {
      const { code } = await promise;
      const token = await this.exchangeCodeForToken(code);
      await this.tokenStore.save(token);
      return token;
    } finally {
      close();
    }
  }

  private async exchangeCodeForToken(code: string): Promise<OAuthToken> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    });

    const response = await axios.post(LINKEDIN_API.TOKEN_URL, body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const parsed = LinkedInTokenResponseSchema.parse(response.data);
    const now = Math.floor(Date.now() / 1000);

    return {
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token ?? "",
      expiresAt: now + parsed.expires_in,
      refreshExpiresAt: now + (parsed.refresh_token_expires_in ?? 31536000),
      scopes: parsed.scope.split(",").map((s) => s.trim()),
    };
  }

  private async refreshAccessToken(refreshToken: string): Promise<OAuthToken> {
    try {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const response = await axios.post(LINKEDIN_API.TOKEN_URL, body.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const parsed = LinkedInTokenResponseSchema.parse(response.data);
      const now = Math.floor(Date.now() / 1000);

      const newToken: OAuthToken = {
        accessToken: parsed.access_token,
        refreshToken: parsed.refresh_token ?? refreshToken,
        expiresAt: now + parsed.expires_in,
        refreshExpiresAt: now + (parsed.refresh_token_expires_in ?? 31536000),
        scopes: parsed.scope.split(",").map((s) => s.trim()),
      };

      await this.tokenStore.save(newToken);
      this.logger.info("Token refreshed successfully");
      return newToken;
    } catch (err) {
      await this.tokenStore.delete();
      const message = err instanceof Error ? err.message : String(err);
      throw new TokenRefreshError(message);
    }
  }

  private isExpired(token: OAuthToken): boolean {
    const now = Math.floor(Date.now() / 1000);
    return token.expiresAt <= now + 60;
  }
}
