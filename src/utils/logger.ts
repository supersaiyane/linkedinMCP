import pino from "pino";
import type { Logger } from "pino";

export function createLogger(level: string, transport: string): Logger {
  const destination = transport === "stdio" ? 2 : 1;

  return pino({
    level,
    base: { service: "amplifyr-mcp", version: "1.0.0" },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: {
      target: "pino/file",
      options: { destination },
    },
  });
}
