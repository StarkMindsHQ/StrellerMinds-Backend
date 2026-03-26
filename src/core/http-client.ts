/**
 * HTTP Client with rate limiting, auth injection, and observability
 */

import { withRetry, RetryOptions, ApiResponse, sleep } from './base';

export type AuthStrategy =
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apiKey'; header: string; value: string }
  | { type: 'oauth2'; accessToken: string; refreshToken?: string };

export interface HttpClientOptions {
  baseUrl: string;
  auth?: AuthStrategy;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  rateLimitPerMinute?: number;
}

interface QueuedRequest {
  fn: () => Promise<Response>;
  resolve: (value: Response) => void;
  reject: (reason: unknown) => void;
}

export class HttpClient {
  private options: HttpClientOptions;
  private requestQueue: QueuedRequest[] = [];
  private requestTimestamps: number[] = [];
  private processingQueue = false;

  constructor(options: HttpClientOptions) {
    this.options = {
      timeout: 30000,
      ...options,
    };
  }

  private getAuthHeaders(): Record<string, string> {
    const { auth } = this.options;
    if (!auth) return {};

    switch (auth.type) {
      case 'bearer':
        return { Authorization: `Bearer ${auth.token}` };
      case 'basic': {
        const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        return { Authorization: `Basic ${encoded}` };
      }
      case 'apiKey':
        return { [auth.header]: auth.value };
      case 'oauth2':
        return { Authorization: `Bearer ${auth.accessToken}` };
      default:
        return {};
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const limit = this.options.rateLimitPerMinute;
    if (!limit) return;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > oneMinuteAgo);

    if (this.requestTimestamps.length >= limit) {
      const oldestRequest = this.requestTimestamps[0];
      const waitMs = oldestRequest + 60000 - now + 100;
      await sleep(waitMs);
    }

    this.requestTimestamps.push(Date.now());
  }

  async get<T>(
    path: string,
    params?: Record<string, string>,
    retryOptions?: Partial<RetryOptions>,
  ): Promise<ApiResponse<T>> {
    const url = new URL(path, this.options.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    }

    return this.request<T>(url.toString(), { method: 'GET' }, retryOptions);
  }

  async post<T>(
    path: string,
    body?: unknown,
    retryOptions?: Partial<RetryOptions>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      new URL(path, this.options.baseUrl).toString(),
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
        headers: { 'Content-Type': 'application/json' },
      },
      retryOptions,
    );
  }

  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(new URL(path, this.options.baseUrl).toString(), {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(new URL(path, this.options.baseUrl).toString(), {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(new URL(path, this.options.baseUrl).toString(), {
      method: 'DELETE',
    });
  }

  private async request<T>(
    url: string,
    init: RequestInit,
    retryOptions?: Partial<RetryOptions>,
  ): Promise<ApiResponse<T>> {
    await this.enforceRateLimit();

    const headers = {
      ...this.options.defaultHeaders,
      ...this.getAuthHeaders(),
      ...(init.headers as Record<string, string>),
    };

    return withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

      try {
        const response = await fetch(url, {
          ...init,
          headers,
          signal: controller.signal,
        });

        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          const error = new Error(`HTTP ${response.status}: ${errorBody}`);
          (error as { statusCode?: number }).statusCode = response.status;
          throw error;
        }

        const contentType = response.headers.get('content-type') || '';
        const data: T = contentType.includes('application/json')
          ? await response.json()
          : ((await response.text()) as unknown as T);

        return {
          data,
          statusCode: response.status,
          rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : undefined,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    }, retryOptions);
  }

  updateAuth(auth: AuthStrategy): void {
    this.options.auth = auth;
  }
}
