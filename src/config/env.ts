import { z } from "zod";
import { configDotenv } from "dotenv";

configDotenv({ quiet: true });

const EnvSchema = z.object({
  LINKEDIN_CLIENT_ID: z.string().min(1, "LINKEDIN_CLIENT_ID is required"),
  LINKEDIN_CLIENT_SECRET: z.string().min(1, "LINKEDIN_CLIENT_SECRET is required"),
  LINKEDIN_REDIRECT_URI: z.string().url().default("http://localhost:3456/callback"),

  TOKEN_STORE_TYPE: z.enum(["file", "env"]).default("file"),
  TOKEN_STORE_PATH: z.string().default("./data/tokens.enc"),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(32, "Encryption key must be at least 32 chars")
    .default("CHANGE_ME_IN_PRODUCTION_32CHARS!!"),

  LINKEDIN_ACCESS_TOKEN: z.string().optional(),
  LINKEDIN_REFRESH_TOKEN: z.string().optional(),

  MCP_TRANSPORT: z.enum(["stdio", "sse"]).default("stdio"),
  SSE_PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  SCHEDULER_ENABLED: z.coerce.boolean().default(true),
  SCHEDULER_DB_PATH: z.string().default("./data/scheduler.db"),

  RATE_LIMIT_POSTS_PER_DAY: z.coerce.number().default(100),
  RATE_LIMIT_API_PER_MINUTE: z.coerce.number().default(150),

  // Telegram notifications (optional)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  // Medium integration (optional)
  MEDIUM_INTEGRATION_TOKEN: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function loadConfig(): EnvConfig {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`❌ Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }
  return result.data;
}
