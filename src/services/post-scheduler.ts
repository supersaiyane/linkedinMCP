import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { Cron } from "croner";
import type { Logger } from "pino";
import type { LinkedInAPIClient } from "../api/linkedin-client.js";
import type { ScheduledPost } from "../models/types.js";
import { SchedulerError, PastDateError } from "../models/errors.js";
import { generateId } from "../utils/id.js";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS scheduled_posts (
    id TEXT PRIMARY KEY,
    content_type TEXT NOT NULL CHECK(content_type IN ('text', 'article')),
    content_json TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'PUBLIC',
    scheduled_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED')),
    result_url TEXT,
    result_urn TEXT,
    error_message TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TEXT
  )`;

const CREATE_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_scheduled_status
  ON scheduled_posts(status, scheduled_at)`;

interface ScheduleInput {
  contentType: "text" | "article";
  contentJson: string;
  visibility: string;
  scheduledAt: string;
}

export class PostScheduler {
  private db: Database.Database;
  private cron: Cron | null = null;

  constructor(
    private dbPath: string,
    private apiClient: LinkedInAPIClient,
    private logger: Logger,
  ) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(CREATE_TABLE_SQL);
    this.db.exec(CREATE_INDEX_SQL);
  }

  schedule(input: ScheduleInput): ScheduledPost {
    const scheduledDate = new Date(input.scheduledAt);
    const minDate = new Date(Date.now() + 5 * 60 * 1000);

    if (scheduledDate <= minDate) {
      throw new PastDateError();
    }

    const id = generateId();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO scheduled_posts (id, content_type, content_json, visibility, scheduled_at, created_at, status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `);

    stmt.run(
      id,
      input.contentType,
      input.contentJson,
      input.visibility,
      input.scheduledAt,
      now,
    );

    this.logger.info({ id, scheduledAt: input.scheduledAt }, "Post scheduled");

    return {
      id,
      contentType: input.contentType,
      contentJson: input.contentJson,
      visibility: input.visibility,
      scheduledAt: input.scheduledAt,
      createdAt: now,
      status: "PENDING",
      attemptCount: 0,
    };
  }

  async poll(): Promise<void> {
    const now = new Date().toISOString();
    const rows = this.db
      .prepare(
        `SELECT * FROM scheduled_posts WHERE status = 'PENDING' AND scheduled_at <= ?`,
      )
      .all(now) as Array<Record<string, unknown>>;

    for (const row of rows) {
      const id = row.id as string;
      try {
        this.db
          .prepare(
            `UPDATE scheduled_posts SET status = 'PUBLISHING', attempt_count = attempt_count + 1, last_attempt_at = ? WHERE id = ?`,
          )
          .run(now, id);

        const content = JSON.parse(row.content_json as string);
        const visibility = (row.visibility as string) === "CONNECTIONS" ? "CONNECTIONS" as const : "PUBLIC" as const;
        const result = await this.apiClient.createPost({
          text: content.text,
          visibility,
          mediaUrns: content.mediaUrns ?? [],
          hashtags: content.hashtags ?? [],
        });

        this.db
          .prepare(
            `UPDATE scheduled_posts SET status = 'PUBLISHED', result_url = ?, result_urn = ? WHERE id = ?`,
          )
          .run(result.url, result.urn, id);

        this.logger.info({ id, urn: result.urn }, "Scheduled post published");
      } catch (err) {
        const attemptCount = ((row.attempt_count as number) ?? 0) + 1;
        const message = err instanceof Error ? err.message : String(err);

        if (attemptCount < 3) {
          this.db
            .prepare(`UPDATE scheduled_posts SET status = 'PENDING' WHERE id = ?`)
            .run(id);
        } else {
          this.db
            .prepare(
              `UPDATE scheduled_posts SET status = 'FAILED', error_message = ? WHERE id = ?`,
            )
            .run(message, id);
        }

        this.logger.error({ id, error: message }, "Failed to publish scheduled post");
      }
    }
  }

  cancel(id: string): void {
    const result = this.db
      .prepare(
        `UPDATE scheduled_posts SET status = 'CANCELLED' WHERE id = ? AND status = 'PENDING'`,
      )
      .run(id);

    if (result.changes === 0) {
      throw new SchedulerError("Post not found or already processed");
    }

    this.logger.info({ id }, "Scheduled post cancelled");
  }

  listPosts(status?: string): ScheduledPost[] {
    let sql = "SELECT * FROM scheduled_posts";
    const params: string[] = [];

    if (status) {
      sql += " WHERE status = ?";
      params.push(status);
    }

    sql += " ORDER BY scheduled_at ASC";

    const rows = this.db.prepare(sql).all(...params) as Array<
      Record<string, unknown>
    >;

    return rows.map((row) => ({
      id: row.id as string,
      contentType: row.content_type as "text" | "article",
      contentJson: row.content_json as string,
      visibility: row.visibility as string,
      scheduledAt: row.scheduled_at as string,
      createdAt: row.created_at as string,
      status: row.status as ScheduledPost["status"],
      resultUrl: (row.result_url as string) ?? null,
      resultUrn: (row.result_urn as string) ?? null,
      errorMessage: (row.error_message as string) ?? null,
      attemptCount: (row.attempt_count as number) ?? 0,
    }));
  }

  start(): void {
    this.cron = new Cron("* * * * *", async () => {
      try {
        await this.poll();
      } catch (err) {
        this.logger.error({ error: err }, "Scheduler poll error");
      }
    });
    this.logger.info("Scheduler started (polling every minute)");
  }

  stop(): void {
    this.cron?.stop();
    this.cron = null;
    this.logger.info("Scheduler stopped");
  }

  close(): void {
    this.stop();
    this.db.close();
  }
}
