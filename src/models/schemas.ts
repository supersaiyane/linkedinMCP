import { z } from "zod";

export const OAuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
  refreshExpiresAt: z.number(),
  scopes: z.array(z.string()),
  memberUrn: z.string().optional(),
});

export const PostContentSchema = z.object({
  text: z.string().min(1).max(3000),
  visibility: z.enum(["PUBLIC", "CONNECTIONS"]).default("PUBLIC"),
  mediaUrns: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
});

export const ArticleContentSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  sourceUrl: z.string().url(),
  coverImageUrn: z.string().optional(),
  visibility: z.enum(["PUBLIC", "CONNECTIONS"]).default("PUBLIC"),
});

export const UserProfileSchema = z.object({
  sub: z.string(),
  name: z.string(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  picture: z.string().url().optional(),
  email: z.string().email().optional(),
});

export const PostResultSchema = z.object({
  urn: z.string(),
  url: z.string().url(),
});

export const ScheduledPostSchema = z.object({
  id: z.string().uuid(),
  contentType: z.enum(["text", "article"]),
  contentJson: z.string(),
  visibility: z.string(),
  scheduledAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  status: z.enum(["PENDING", "PUBLISHING", "PUBLISHED", "FAILED", "CANCELLED"]),
  resultUrl: z.string().nullable().optional(),
  resultUrn: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  attemptCount: z.number().default(0),
});

export const LinkedInTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  refresh_token_expires_in: z.number().optional(),
  scope: z.string(),
});

export const LinkedInImageInitResponseSchema = z.object({
  value: z.object({
    uploadUrlExpiresAt: z.number(),
    uploadUrl: z.string().url(),
    image: z.string(),
  }),
});
