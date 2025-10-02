import * as Sentry from '@sentry/node';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  enabled: boolean;
  debug: boolean;
  integrations: {
    http: boolean;
    express: boolean;
    console: boolean;
  };
}

@Injectable()
export class SentryConfigService {
  private readonly config: SentryConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      dsn: this.configService.get<string>('SENTRY_DSN', ''),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      release: this.configService.get<string>('APP_VERSION', '1.0.0'),
      tracesSampleRate: this.configService.get<number>('SENTRY_TRACES_SAMPLE_RATE', 0.1),
      enabled: this.configService.get<boolean>('SENTRY_ENABLED', false),
      debug: this.configService.get<boolean>('SENTRY_DEBUG', false),
      integrations: {
        http: this.configService.get<boolean>('SENTRY_HTTP_INTEGRATION', true),
        express: this.configService.get<boolean>('SENTRY_EXPRESS_INTEGRATION', true),
        console: this.configService.get<boolean>('SENTRY_CONSOLE_INTEGRATION', true),
      },
    };
  }

  initializeSentry(): void {
    if (!this.config.enabled || !this.config.dsn) {
      console.log('Sentry is disabled or DSN not provided');
      return;
    }

    const integrations = [];

    if (this.config.integrations.http) {
      integrations.push(new Sentry.Integrations.Http({ tracing: true }));
    }

    if (this.config.integrations.express) {
      integrations.push(new Sentry.Integrations.Express({ app: undefined }));
    }

    if (this.config.integrations.console) {
      integrations.push(new Sentry.Integrations.Console());
    }

    Sentry.init({
      dsn: this.config.dsn,
      environment: this.config.environment,
      release: this.config.release,
      tracesSampleRate: this.config.tracesSampleRate,
      debug: this.config.debug,
      integrations,
      beforeSend: (event, hint) => {
        // Filter out sensitive data
        if (event.request) {
          // Remove sensitive headers
          if (event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
            delete event.request.headers['x-api-key'];
          }

          // Remove sensitive query parameters
          if (event.request.query_string) {
            event.request.query_string = this.sanitizeQueryString(event.request.query_string);
          }
        }

        // Add custom tags
        event.tags = {
          ...event.tags,
          service: 'strellerminds-backend',
          version: this.config.release,
        };

        return event;
      },
    });

    console.log(`Sentry initialized for environment: ${this.config.environment}`);
  }

  captureException(error: Error, context?: any): string {
    if (!this.config.enabled) {
      return '';
    }

    return Sentry.captureException(error, {
      tags: {
        component: context?.component || 'unknown',
        correlationId: context?.correlationId,
      },
      user: context?.user
        ? {
            id: context.user.id,
            email: context.user.email,
          }
        : undefined,
      extra: {
        ...context,
        timestamp: new Date().toISOString(),
      },
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: any): string {
    if (!this.config.enabled) {
      return '';
    }

    return Sentry.captureMessage(message, level, {
      tags: {
        component: context?.component || 'unknown',
        correlationId: context?.correlationId,
      },
      user: context?.user
        ? {
            id: context.user.id,
            email: context.user.email,
          }
        : undefined,
      extra: {
        ...context,
        timestamp: new Date().toISOString(),
      },
    });
  }

  setUserContext(user: { id: string; email?: string }): void {
    if (!this.config.enabled) {
      return;
    }

    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  }

  setTag(key: string, value: string): void {
    if (!this.config.enabled) {
      return;
    }

    Sentry.setTag(key, value);
  }

  setContext(key: string, context: any): void {
    if (!this.config.enabled) {
      return;
    }

    Sentry.setContext(key, context);
  }

  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.config.enabled) {
      return;
    }

    Sentry.addBreadcrumb(breadcrumb);
  }

  private sanitizeQueryString(queryString: string): string {
    // Remove sensitive query parameters
    const sensitiveParams = ['password', 'token', 'secret', 'key', 'auth'];
    let sanitized = queryString;

    sensitiveParams.forEach((param) => {
      const regex = new RegExp(`${param}=[^&]*`, 'gi');
      sanitized = sanitized.replace(regex, `${param}=***`);
    });

    return sanitized;
  }

  getConfig(): SentryConfig {
    return { ...this.config };
  }
}
