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

  async getUserProfile(): Promise<UserProfile> {
    this.rateLimiter.checkLimit("api");
    const token = await this.authManager.getValidToken();

    const response = await this.client.get(LINKEDIN_API.ENDPOINTS.ME, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });

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

    const token = await this.authManager.getValidToken();
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
        { headers: { Authorization: `Bearer ${token.accessToken}` } },
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        this.logger.error({
          status: err.response.status,
          headers: err.response.headers,
          data: err.response.data,
        }, "LinkedIn createPost failed");
        throw new LinkedInAPIError(
          err.response.status,
          JSON.stringify(err.response.data),
          err.response.data,
        );
      }
      throw err;
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

    const token = await this.authManager.getValidToken();
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
        { headers: { Authorization: `Bearer ${token.accessToken}` } },
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        this.logger.error({
          status: err.response.status,
          headers: err.response.headers,
          data: err.response.data,
        }, "LinkedIn createArticlePost failed");
        throw new LinkedInAPIError(
          err.response.status,
          JSON.stringify(err.response.data),
          err.response.data,
        );
      }
      throw err;
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
    const token = await this.authManager.getValidToken();
    const owner = await this.getMemberUrn();

    const response = await this.client.post(
      LINKEDIN_API.ENDPOINTS.IMAGES_INIT,
      { initializeUploadRequest: { owner } },
      { headers: { Authorization: `Bearer ${token.accessToken}` } },
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
}
