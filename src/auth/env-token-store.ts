import type { OAuthToken } from "../models/types.js";
import { TokenStoreError } from "../models/errors.js";
import type { TokenStore } from "./token-store.js";

export class EnvTokenStore implements TokenStore {
  constructor(
    private accessToken?: string,
    private refreshToken?: string,
  ) {}

  async load(): Promise<OAuthToken | null> {
    if (!this.accessToken) {
      return null;
    }
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken ?? "",
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      refreshExpiresAt: Math.floor(Date.now() / 1000) + 86400 * 365,
      scopes: ["openid", "profile", "w_member_social"],
    };
  }

  async save(): Promise<void> {
    throw new TokenStoreError(
      "EnvTokenStore is read-only. Set LINKEDIN_ACCESS_TOKEN in environment.",
    );
  }

  async delete(): Promise<void> {
    throw new TokenStoreError("EnvTokenStore is read-only. Remove env vars manually.");
  }
}
