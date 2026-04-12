export const LINKEDIN_API = {
  BASE_URL: "https://api.linkedin.com",
  AUTH_URL: "https://www.linkedin.com/oauth/v2/authorization",
  TOKEN_URL: "https://www.linkedin.com/oauth/v2/accessToken",

  VERSION: "202601",

  // Primary app scopes (Share on LinkedIn + Sign In with LinkedIn products)
  SCOPES: [
    "openid",
    "profile",
    "w_member_social",
  ],

  // Community Management API app scopes (separate app — this product must be the only one)
  // Grants access to: socialActions (read comments, post stats, reply)
  COMMUNITY_SCOPES: [
    "r_member_social",
    "w_member_social",
  ],

  COMMUNITY_CALLBACK_PORT: 3457,

  ENDPOINTS: {
    ME: "/v2/userinfo",
    POSTS: "/rest/posts",
    IMAGES_INIT: "/rest/images?action=initializeUpload",
    DOCUMENTS_INIT: "/rest/documents?action=initializeUpload",
    SOCIAL_ACTIONS: "/rest/socialActions",
    SOCIAL_METADATA: "/rest/socialMetadata",
    NETWORK_SIZES: "/rest/networkSizes",
  },

  DEFAULT_HEADERS: {
    "Linkedin-Version": "202601",
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  },

  LIMITS: {
    POST_TEXT_MAX_CHARS: 3000,
    ARTICLE_TITLE_MAX_CHARS: 200,
    HASHTAGS_MAX: 30,
    IMAGE_MAX_SIZE_BYTES: 8 * 1024 * 1024,
    DOCUMENT_MAX_SIZE_BYTES: 100 * 1024 * 1024,
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif"],
    ALLOWED_DOC_TYPES: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },

  CALLBACK_PORT: 3456,
  CALLBACK_PATH: "/callback",
} as const;
