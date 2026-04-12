import axios, { type AxiosInstance } from "axios";
import type { Logger } from "pino";
import { LINKEDIN_API } from "../config/linkedin-api.js";
import {
  UserProfileSchema,
  LinkedInImageInitResponseSchema,
} from "../models/schemas.js";
import type { PostContent, UserProfile, PostResult } from "../models/types.js";
import { LinkedInAPIError } from "../models/errors.js";
import type { AuthManager } from "../auth/auth-manager.js";
import { RateLimiter } from "./rate-limiter.js";
import { setupRetryInterceptor } from "./retry.js";

export interface ArticlePostInput {
  commentary: string;
  sourceUrl: string;
  title: string;
  description?: string;
  coverImageUrn?: string;
  visibility: string;
}

export interface PostStats {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
}

export interface PostComment {
  commentUrn: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface ProfileStats {
  followers: number;
  profileViews: number | null;
  searchAppearances: number | null;
}

export class LinkedInAPIClient {
  private client: AxiosInstance;
  private memberUrn: string | null = null;

  constructor(
    private authManager: AuthManager,
    private rateLimiter: RateLimiter,
    private logger: Logger,
  ) {
    this.client = axios.create({
      baseURL: LINKEDIN_API.BASE_URL,
      headers: { ...LINKEDIN_API.DEFAULT_HEADERS },
    });
    setupRetryInterceptor(this.client);
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.authManager.getValidToken();
    return { Authorization: `Bearer ${token.accessToken}` };
  }

  private handleApiError(err: unknown, operation: string): never {
    if (axios.isAxiosError(err) && err.response) {
      this.logger.error({
        status: err.response.status,
        headers: err.response.headers,
        data: err.response.data,
      }, `LinkedIn ${operation} failed`);
      throw new LinkedInAPIError(
        err.response.status,
        JSON.stringify(err.response.data),
        err.response.data,
      );
    }
    throw err;
  }

  async getUserProfile(): Promise<UserProfile> {
    this.rateLimiter.checkLimit("api");
    const headers = await this.authHeaders();

    const response = await this.client.get(LINKEDIN_API.ENDPOINTS.ME, { headers });

    this.rateLimiter.recordRequest("api");
    const profile = UserProfileSchema.parse(response.data);
    this.memberUrn = `urn:li:person:${profile.sub}`;
    return profile;
  }

  async getMemberUrn(): Promise<string> {
    if (this.memberUrn) return this.memberUrn;
    const profile = await this.getUserProfile();
    return `urn:li:person:${profile.sub}`;
  }

  async createPost(content: PostContent): Promise<PostResult> {
    this.rateLimiter.checkLimit("posts");
    this.rateLimiter.checkLimit("api");

    const headers = await this.authHeaders();
    const author = await this.getMemberUrn();

    const body: Record<string, unknown> = {
      author,
      commentary: content.text,
      visibility: content.visibility,
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    };

    if (content.mediaUrns.length === 1) {
      body.content = {
        media: { title: "Image", id: content.mediaUrns[0] },
      };
    } else if (content.mediaUrns.length > 1) {
      body.content = {
        multiImage: {
          images: content.mediaUrns.map((id) => ({ id, altText: "" })),
        },
      };
    }

    let response;
    try {
      response = await this.client.post(
        LINKEDIN_API.ENDPOINTS.POSTS,
        body,
        { headers },
      );
    } catch (err: unknown) {
      this.handleApiError(err, "createPost");
    }

    this.rateLimiter.recordRequest("posts");
    this.rateLimiter.recordRequest("api");

    const postUrn = response.headers["x-restli-id"] as string;
    if (!postUrn) {
      throw new LinkedInAPIError(
        response.status,
        "Missing x-restli-id header in response",
      );
    }

    const postUrl = `https://www.linkedin.com/feed/update/${postUrn}/`;
    return { urn: postUrn, url: postUrl };
  }

  async createArticlePost(input: ArticlePostInput): Promise<PostResult> {
    this.rateLimiter.checkLimit("posts");
    this.rateLimiter.checkLimit("api");

    const headers = await this.authHeaders();
    const author = await this.getMemberUrn();

    const articleContent: Record<string, unknown> = {
      source: input.sourceUrl,
      title: input.title,
    };
    if (input.description) {
      articleContent.description = input.description;
    }
    if (input.coverImageUrn) {
      articleContent.thumbnail = input.coverImageUrn;
    }

    const body = {
      author,
      commentary: input.commentary,
      visibility: input.visibility,
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      content: { article: articleContent },
    };

    let response;
    try {
      response = await this.client.post(
        LINKEDIN_API.ENDPOINTS.POSTS,
        body,
        { headers },
      );
    } catch (err: unknown) {
      this.handleApiError(err, "createArticlePost");
    }

    this.rateLimiter.recordRequest("posts");
    this.rateLimiter.recordRequest("api");

    const postUrn = response.headers["x-restli-id"] as string;
    if (!postUrn) {
      throw new LinkedInAPIError(
        response.status,
        "Missing x-restli-id header in response",
      );
    }

    const postUrl = `https://www.linkedin.com/feed/update/${postUrn}/`;
    return { urn: postUrn, url: postUrl };
  }

  async initializeImageUpload(): Promise<{
    uploadUrl: string;
    imageUrn: string;
  }> {
    this.rateLimiter.checkLimit("api");
    const headers = await this.authHeaders();
    const owner = await this.getMemberUrn();

    const response = await this.client.post(
      LINKEDIN_API.ENDPOINTS.IMAGES_INIT,
      { initializeUploadRequest: { owner } },
      { headers },
    );

    this.rateLimiter.recordRequest("api");
    const parsed = LinkedInImageInitResponseSchema.parse(response.data);
    return {
      uploadUrl: parsed.value.uploadUrl,
      imageUrn: parsed.value.image,
    };
  }

  async uploadImageBinary(
    uploadUrl: string,
    data: Buffer,
    mimeType: string,
  ): Promise<void> {
    this.rateLimiter.checkLimit("api");
    const token = await this.authManager.getValidToken();

    await axios.put(uploadUrl, data, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": mimeType,
      },
    });

    this.rateLimiter.recordRequest("api");
  }

  // ═══════════════════════════════════════════════════════
  // NEW METHODS — Post Analytics, Comments, Social Actions
  // ═══════════════════════════════════════════════════════

  async getPostStats(postUrn: string): Promise<PostStats> {
    this.rateLimiter.checkLimit("api");
    const headers = await this.authHeaders();
    const author = await this.getMemberUrn();

    try {
      const response = await this.client.get(
        `${LINKEDIN_API.ENDPOINTS.SHARE_STATISTICS}?q=organizationalEntity&organizationalEntity=${encodeURIComponent(author)}&shares[0]=${encodeURIComponent(postUrn)}`,
        { headers },
      );

      this.rateLimiter.recordRequest("api");

      const elements = response.data?.elements ?? [];
      if (elements.length === 0) {
        return { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
      }

      const stats = elements[0]?.totalShareStatistics ?? {};
      return {
        impressions: stats.impressionCount ?? 0,
        likes: stats.likeCount ?? 0,
        comments: stats.commentCount ?? 0,
        shares: stats.shareCount ?? 0,
        clicks: stats.clickCount ?? 0,
      };
    } catch (err: unknown) {
      this.handleApiError(err, "getPostStats");
    }
  }

  async getComments(postUrn: string, count: number = 20): Promise<PostComment[]> {
    this.rateLimiter.checkLimit("api");
    const headers = await this.authHeaders();

    try {
      const response = await this.client.get(
        `${LINKEDIN_API.ENDPOINTS.SOCIAL_ACTIONS}/${encodeURIComponent(postUrn)}/comments?count=${count}`,
        { headers },
      );

      this.rateLimiter.recordRequest("api");

      const elements = response.data?.elements ?? [];
      return elements.map((el: Record<string, unknown>) => ({
        commentUrn: (el["$URN"] as string) ?? (el.commentUrn as string) ?? "",
        author: (el.actor as string) ?? "",
        text: ((el.message as Record<string, unknown>)?.text as string) ?? "",
        timestamp: (el.created as Record<string, unknown>)?.time as number ?? 0,
      }));
    } catch (err: unknown) {
      this.handleApiError(err, "getComments");
    }
  }

  async replyToComment(
    postUrn: string,
    parentCommentUrn: string,
    text: string,
  ): Promise<string> {
    this.rateLimiter.checkLimit("api");
    const headers = await this.authHeaders();
    const actor = await this.getMemberUrn();

    try {
      const response = await this.client.post(
        `${LINKEDIN_API.ENDPOINTS.SOCIAL_ACTIONS}/${encodeURIComponent(postUrn)}/comments`,
        {
          actor,
          message: { text },
          parentComment: parentCommentUrn,
        },
        { headers },
      );

      this.rateLimiter.recordRequest("api");
      return (response.data?.["$URN"] as string) ?? "comment_created";
    } catch (err: unknown) {
      this.handleApiError(err, "replyToComment");
    }
  }

  async deletePost(postUrn: string): Promise<void> {
    this.rateLimiter.checkLimit("api");
    const headers = await this.authHeaders();

    try {
      await this.client.delete(
        `${LINKEDIN_API.ENDPOINTS.POSTS}/${encodeURIComponent(postUrn)}`,
        { headers },
      );
      this.rateLimiter.recordRequest("api");
    } catch (err: unknown) {
      this.handleApiError(err, "deletePost");
    }
  }

  async editPost(postUrn: string, text: string): Promise<void> {
    this.rateLimiter.checkLimit("api");
    const headers = await this.authHeaders();

    try {
      await this.client.patch(
        `${LINKEDIN_API.ENDPOINTS.POSTS}/${encodeURIComponent(postUrn)}`,
        { commentary: text },
        { headers },
      );
      this.rateLimiter.recordRequest("api");
    } catch (err: unknown) {
      this.handleApiError(err, "editPost");
    }
  }

  async likePost(postUrn: string): Promise<void> {
    this.rateLimiter.checkLimit("api");
    const headers = await this.authHeaders();
    const actor = await this.getMemberUrn();

    try {
      await this.client.post(
        `${LINKEDIN_API.ENDPOINTS.SOCIAL_ACTIONS}/${encodeURIComponent(postUrn)}/likes`,
        { actor, object: postUrn },
        { headers },
      );
      this.rateLimiter.recordRequest("api");
    } catch (err: unknown) {
      this.handleApiError(err, "likePost");
    }
  }

  async getProfileStats(): Promise<ProfileStats> {
    this.rateLimiter.checkLimit("api");
    const headers = await this.authHeaders();
    const memberUrn = await this.getMemberUrn();

    try {
      const response = await this.client.get(
        `${LINKEDIN_API.ENDPOINTS.NETWORK_SIZES}/${encodeURIComponent(memberUrn)}?edgeType=FOLLOWER`,
        { headers },
      );

      this.rateLimiter.recordRequest("api");

      return {
        followers: response.data?.firstDegreeSize ?? 0,
        profileViews: null,
        searchAppearances: null,
      };
    } catch (err: unknown) {
      this.handleApiError(err, "getProfileStats");
    }
  }

  async searchPosts(query: string, count: number = 10): Promise<Array<Record<string, unknown>>> {
    this.rateLimiter.checkLimit("api");
    const headers = await this.authHeaders();

    try {
      const response = await this.client.get(
        `${LINKEDIN_API.ENDPOINTS.POSTS}?q=author&author=${encodeURIComponent(await this.getMemberUrn())}&count=${count}`,
        { headers },
      );

      this.rateLimiter.recordRequest("api");

      const elements = response.data?.elements ?? [];
      return elements.filter((el: Record<string, unknown>) => {
        const commentary = (el.commentary as string) ?? "";
        return commentary.toLowerCase().includes(query.toLowerCase());
      });
    } catch (err: unknown) {
      this.handleApiError(err, "searchPosts");
    }
  }
}
