export class LinkedInMCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AuthenticationError extends LinkedInMCPError {
  constructor(message: string) {
    super(message, "AUTH_ERROR");
  }
}

export class TokenExpiredError extends LinkedInMCPError {
  constructor() {
    super("Access token has expired", "TOKEN_EXPIRED");
  }
}

export class TokenRefreshError extends LinkedInMCPError {
  constructor(reason: string) {
    super(`Token refresh failed: ${reason}`, "TOKEN_REFRESH_FAILED");
  }
}

export class RateLimitError extends LinkedInMCPError {
  constructor(public retryAfterSeconds: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfterSeconds}s`,
      "RATE_LIMIT",
      { retryAfterSeconds },
    );
  }
}

export class LinkedInAPIError extends LinkedInMCPError {
  constructor(
    public statusCode: number,
    message: string,
    public responseBody?: unknown,
  ) {
    super(
      `LinkedIn API error (${statusCode}): ${message}`,
      "API_ERROR",
      { statusCode, responseBody },
    );
  }
}

export class ContentValidationError extends LinkedInMCPError {
  constructor(public errors: string[]) {
    super(
      `Content validation failed: ${errors.join(", ")}`,
      "VALIDATION_ERROR",
      { errors },
    );
  }
}

export class InvalidMediaError extends LinkedInMCPError {
  constructor(reason: string) {
    super(reason, "INVALID_MEDIA");
  }
}

export class SchedulerError extends LinkedInMCPError {
  constructor(message: string) {
    super(message, "SCHEDULER_ERROR");
  }
}

export class PastDateError extends LinkedInMCPError {
  constructor() {
    super(
      "Scheduled time must be at least 5 minutes in the future",
      "PAST_DATE",
    );
  }
}

export class TokenStoreError extends LinkedInMCPError {
  constructor(message: string) {
    super(message, "TOKEN_STORE_ERROR");
  }
}
