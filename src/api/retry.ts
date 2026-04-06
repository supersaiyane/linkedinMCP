import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { AuthenticationError } from "../models/errors.js";

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

interface RequestConfigWithRetry extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

function isRetryableStatus(status: number | undefined): boolean {
  if (!status) return false;
  return status === 429 || (status >= 500 && status <= 504);
}

function isNetworkError(error: AxiosError): boolean {
  return (
    !error.response &&
    ["ECONNRESET", "ETIMEDOUT", "ECONNABORTED"].includes(
      error.code ?? "",
    )
  );
}

function getDelay(
  retryCount: number,
  config: RetryConfig,
  retryAfterHeader?: string,
): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) return seconds * 1000;
  }
  const exponential =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount);
  const jitter = Math.random() * 500;
  return Math.min(exponential + jitter, config.maxDelayMs);
}

export function setupRetryInterceptor(
  client: AxiosInstance,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
): void {
  client.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as RequestConfigWithRetry | undefined;
    if (!config) return Promise.reject(error);

    if (error.response?.status === 401) {
      throw new AuthenticationError(
        "LinkedIn returned 401. Token may be invalid.",
      );
    }

    const retryCount = config.__retryCount ?? 0;

    const shouldRetry =
      retryCount < retryConfig.maxRetries &&
      (isRetryableStatus(error.response?.status) || isNetworkError(error));

    if (!shouldRetry) return Promise.reject(error);

    config.__retryCount = retryCount + 1;

    const retryAfter = error.response?.headers?.["retry-after"] as
      | string
      | undefined;
    const delay = getDelay(retryCount, retryConfig, retryAfter);

    await new Promise((resolve) => setTimeout(resolve, delay));
    return client.request(config);
  });
}
