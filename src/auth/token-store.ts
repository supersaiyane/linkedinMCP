import type { OAuthToken } from "../models/types.js";

export interface TokenStore {
  load(): Promise<OAuthToken | null>;
  save(token: OAuthToken): Promise<void>;
  delete(): Promise<void>;
}
