import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { TracingService } from './tracing.service';

export interface TracedHttpRequestConfig extends AxiosRequestConfig {
  serviceName?: string;
  operation?: string;
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
}

@Injectable()
export class TracedHttpService {
  private readonly logger = new Logger(TracedHttpService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly tracingService: TracingService,
  ) {}

  async get<T = any>(url: string, config?: TracedHttpRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: TracedHttpRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: TracedHttpRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async delete<T = any>(url: string, config?: TracedHttpRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: TracedHttpRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  private async request<T = any>(
    method: string,
    url: string,
    data?: any,
    config: TracedHttpRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    const {
      serviceName = 'external-service',
      operation = method.toLowerCase(),
      includeRequestBody = false,
      includeResponseBody = false,
      ...axiosConfig
    } = config;

    const spanName = `${serviceName}.${operation}`;

    return this.tracingService.withSpan(
      spanName,
      async (span) => {
        const startTime = Date.now();

        // Add request attributes
        span.setAttributes({
          'http.method': method.toUpperCase(),
          'http.url': url,
          'service.name': serviceName,
          'service.operation': operation,
          'http.request.timestamp': startTime,
        });

        // Add request headers if available
        if (axiosConfig.headers) {
          span.setAttributes({
            'http.request.headers.content-type': axiosConfig.headers['content-type'] || '',
            'http.request.headers.authorization': axiosConfig.headers['authorization']
              ? '[REDACTED]'
              : '',
          });
        }

        // Add request body if requested and small
        if (includeRequestBody && data && JSON.stringify(data).length < 1000) {
          span.setAttributes({
            'http.request.body': JSON.stringify(data),
          });
        }

        // Add request size
        if (data) {
          span.setAttributes({
            'http.request.body.size': JSON.stringify(data).length,
          });
        }

        // Inject trace context into headers
        const headers = { ...axiosConfig.headers };
        this.tracingService.injectTraceContext(headers);

        try {
          const response = await firstValueFrom(
            this.httpService.request<T>({
              method: method.toUpperCase(),
              url,
              data,
              ...axiosConfig,
              headers,
            }),
          );

          const duration = Date.now() - startTime;

          // Add response attributes
          span.setAttributes({
            'http.status_code': response.status,
            'http.status_text': response.statusText,
            'http.response.duration_ms': duration,
            'http.response.headers.content-type': response.headers['content-type'] || '',
            'http.response.headers.content-length': response.headers['content-length'] || '0',
            'response.success': response.status >= 200 && response.status < 300,
          });

          // Add response body if requested and small
          if (includeResponseBody && response.data && JSON.stringify(response.data).length < 1000) {
            span.setAttributes({
              'http.response.body': JSON.stringify(response.data),
            });
          }

          // Add performance categorization
          if (duration > 1000) {
            span.setAttributes({
              'performance.slow_request': true,
              'performance.duration_category': 'slow',
            });
          } else if (duration > 500) {
            span.setAttributes({
              'performance.duration_category': 'moderate',
            });
          } else {
            span.setAttributes({
              'performance.duration_category': 'fast',
            });
          }

          this.logger.debug(`External service call completed: ${method} ${url}`, {
            duration,
            statusCode: response.status,
            serviceName,
            operation,
            traceId: span.spanContext().traceId,
          });

          return response;
        } catch (error) {
          const duration = Date.now() - startTime;

          span.setAttributes({
            'http.response.duration_ms': duration,
            'response.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          if (error.response) {
            span.setAttributes({
              'http.status_code': error.response.status,
              'http.status_text': error.response.statusText,
            });
          }

          this.logger.error(`External service call failed: ${method} ${url}`, {
            error: error.message,
            duration,
            statusCode: error.response?.status,
            serviceName,
            operation,
            traceId: span.spanContext().traceId,
          });

          throw error;
        }
      },
      {
        'service.type': 'external',
        'service.name': serviceName,
      },
    );
  }

  /**
   * Create a traced HTTP client for a specific service
   */
  createServiceClient(serviceName: string) {
    return {
      get: <T = any>(url: string, config?: TracedHttpRequestConfig) =>
        this.get<T>(url, { ...config, serviceName }),

      post: <T = any>(url: string, data?: any, config?: TracedHttpRequestConfig) =>
        this.post<T>(url, data, { ...config, serviceName }),

      put: <T = any>(url: string, data?: any, config?: TracedHttpRequestConfig) =>
        this.put<T>(url, data, { ...config, serviceName }),

      delete: <T = any>(url: string, config?: TracedHttpRequestConfig) =>
        this.delete<T>(url, { ...config, serviceName }),

      patch: <T = any>(url: string, data?: any, config?: TracedHttpRequestConfig) =>
        this.patch<T>(url, data, { ...config, serviceName }),
    };
  }
}
