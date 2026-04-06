import type { z } from "zod";
import type {
  OAuthTokenSchema,
  PostContentSchema,
  ArticleContentSchema,
  UserProfileSchema,
  PostResultSchema,
  ScheduledPostSchema,
} from "./schemas.js";

export type OAuthToken = z.infer<typeof OAuthTokenSchema>;
export type PostContent = z.infer<typeof PostContentSchema>;
export type ArticleContent = z.infer<typeof ArticleContentSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type PostResult = z.infer<typeof PostResultSchema>;
export type ScheduledPost = z.infer<typeof ScheduledPostSchema>;
