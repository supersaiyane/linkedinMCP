import { beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://api.linkedin.com/v2/userinfo", () => {
    return HttpResponse.json({
      sub: "test123",
      name: "Test User",
      given_name: "Test",
      family_name: "User",
    });
  }),

  http.post("https://api.linkedin.com/rest/posts", () => {
    return new HttpResponse(null, {
      status: 201,
      headers: { "x-restli-id": "urn:li:share:7654321" },
    });
  }),

  http.post(
    "https://api.linkedin.com/rest/images",
    () => {
      return HttpResponse.json({
        value: {
          uploadUrlExpiresAt: Date.now() + 3600000,
          uploadUrl: "https://www.linkedin.com/dms-uploads/test",
          image: "urn:li:image:D4E10test",
        },
      });
    },
  ),

  http.post("https://www.linkedin.com/oauth/v2/accessToken", () => {
    return HttpResponse.json({
      access_token: "AQV_test_token",
      expires_in: 5184000,
      refresh_token: "AQX_test_refresh",
      refresh_token_expires_in: 31536000,
      scope: "openid,profile,w_member_social",
    });
  }),
];

export const mswServer = setupServer(...handlers);

beforeAll(() => mswServer.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());
