import axios from "axios";
import type { Logger } from "pino";

const MEDIUM_API = "https://api.medium.com/v1";

interface MediumUser {
  id: string;
  username: string;
  name: string;
  url: string;
}

interface MediumPostResult {
  id: string;
  title: string;
  url: string;
  publishStatus: string;
}

interface CreateMediumPostInput {
  title: string;
  content: string;
  contentFormat: "html" | "markdown";
  tags?: string[];
  publishStatus?: "public" | "draft" | "unlisted";
  canonicalUrl?: string;
}

export class MediumClient {
  private userId: string | null = null;

  constructor(
    private token: string,
    private logger: Logger,
  ) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async getUser(): Promise<MediumUser> {
    const response = await axios.get(`${MEDIUM_API}/me`, {
      headers: this.headers(),
    });

    const user = response.data.data as MediumUser;
    this.userId = user.id;
    this.logger.info({ username: user.username }, "Medium user fetched");
    return user;
  }

  async createPost(input: CreateMediumPostInput): Promise<MediumPostResult> {
    if (!this.userId) {
      await this.getUser();
    }

    const response = await axios.post(
      `${MEDIUM_API}/users/${this.userId}/posts`,
      {
        title: input.title,
        contentFormat: input.contentFormat,
        content: input.content,
        tags: input.tags?.slice(0, 5) ?? [],
        publishStatus: input.publishStatus ?? "draft",
        canonicalUrl: input.canonicalUrl,
      },
      { headers: this.headers() },
    );

    const post = response.data.data as MediumPostResult;
    this.logger.info({ postId: post.id, url: post.url }, "Medium post created");
    return post;
  }
}
