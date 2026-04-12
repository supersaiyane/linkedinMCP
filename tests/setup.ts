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

  // Social actions (post stats) — GET /rest/socialActions/{urn}
  http.get("https://api.linkedin.com/rest/socialActions/:urn", ({ params }) => {
    // If the URL ends with /comments or /likes, let those specific handlers match
    const urn = params.urn as string;
    if (urn.includes("/")) {
      return HttpResponse.json({});
    }
    return HttpResponse.json({
      likesSummary: { totalLikes: 42 },
      commentsSummary: { totalFirstLevelComments: 8 },
      numShares: 5,
    });
  }),

  // Get comments
  http.get("https://api.linkedin.com/rest/socialActions/:urn/comments", () => {
    return HttpResponse.json({
      elements: [
        {
          "$URN": "urn:li:comment:(urn:li:share:123,456)",
          actor: "urn:li:person:commenter1",
          message: { text: "Great post!" },
          created: { time: 1712000000000 },
        },
        {
          "$URN": "urn:li:comment:(urn:li:share:123,789)",
          actor: "urn:li:person:commenter2",
          message: { text: "Thanks for sharing." },
          created: { time: 1712001000000 },
        },
      ],
    });
  }),

  // Reply to comment
  http.post("https://api.linkedin.com/rest/socialActions/:urn/comments", () => {
    return HttpResponse.json({
      "$URN": "urn:li:comment:(urn:li:share:123,999)",
    });
  }),

  // Delete post
  http.delete("https://api.linkedin.com/rest/posts/:urn", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Edit post (PATCH)
  http.patch("https://api.linkedin.com/rest/posts/:urn", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Like post
  http.post("https://api.linkedin.com/rest/socialActions/:urn/likes", () => {
    return new HttpResponse(null, { status: 201 });
  }),

  // Network sizes (profile stats)
  http.get("https://api.linkedin.com/rest/networkSizes/:urn", () => {
    return HttpResponse.json({
      firstDegreeSize: 4832,
    });
  }),

  // Upload binary (PUT to dms-uploads)
  http.put("https://www.linkedin.com/dms-uploads/test", () => {
    return new HttpResponse(null, { status: 201 });
  }),

  // Search posts (GET /rest/posts with query params)
  http.get("https://api.linkedin.com/rest/posts", () => {
    return HttpResponse.json({
      elements: [
        {
          id: "urn:li:share:111",
          commentary: "First post about AI and automation",
          createdAt: 1712000000000,
        },
        {
          id: "urn:li:share:222",
          commentary: "Second post about DevOps practices",
          createdAt: 1712100000000,
        },
      ],
    });
  }),
];

export const mswServer = setupServer(...handlers);

beforeAll(() => mswServer.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());
