import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { AxiosInstrumentation } from '@opentelemetry/instrumentation-axios';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { ConfigService } from '@nestjs/config';

export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  exporters: {
    jaeger?: {
      enabled: boolean;
      endpoint: string;
    };
    zipkin?: {
      enabled: boolean;
      endpoint: string;
    };
    otlp?: {
      enabled: boolean;
      endpoint: string;
    };
  };
  sampling: {
    enabled: boolean;
    ratio: number;
  };
  attributes: Record<string, string>;
}

export class TracingConfigService {
  private readonly config: TracingConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      serviceName: this.configService.get<string>('TRACING_SERVICE_NAME', 'strellerminds-backend'),
      serviceVersion: this.configService.get<string>('TRACING_SERVICE_VERSION', '1.0.0'),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      exporters: {
        jaeger: {
          enabled: this.configService.get<boolean>('TRACING_JAEGER_ENABLED', false),
          endpoint: this.configService.get<string>(
            'TRACING_JAEGER_ENDPOINT',
            'http://localhost:14268/api/traces',
          ),
        },
        zipkin: {
          enabled: this.configService.get<boolean>('TRACING_ZIPKIN_ENABLED', false),
          endpoint: this.configService.get<string>(
            'TRACING_ZIPKIN_ENDPOINT',
            'http://localhost:9411/api/v2/spans',
          ),
        },
        otlp: {
          enabled: this.configService.get<boolean>('TRACING_OTLP_ENABLED', false),
          endpoint: this.configService.get<string>(
            'TRACING_OTLP_ENDPOINT',
            'http://localhost:4318/v1/traces',
          ),
        },
      },
      sampling: {
        enabled: this.configService.get<boolean>('TRACING_SAMPLING_ENABLED', true),
        ratio: this.configService.get<number>('TRACING_SAMPLING_RATIO', 0.1),
      },
      attributes: {
        'service.name': this.configService.get<string>(
          'TRACING_SERVICE_NAME',
          'strellerminds-backend',
        ),
        'service.version': this.configService.get<string>('TRACING_SERVICE_VERSION', '1.0.0'),
        'deployment.environment': this.configService.get<string>('NODE_ENV', 'development'),
        'service.instance.id': this.configService.get<string>('HOSTNAME', 'localhost'),
      },
    };
  }

  getConfig(): TracingConfig {
    return this.config;
  }

  isEnabled(): boolean {
    return (
      this.config.exporters.jaeger?.enabled ||
      this.config.exporters.zipkin?.enabled ||
      this.config.exporters.otlp?.enabled
    );
  }
}

export function createTracingSDK(config: TracingConfig): NodeSDK {
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
    ...config.attributes,
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter: createTraceExporter(config),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable auto-instrumentations we'll configure manually
        '@opentelemetry/instrumentation-http': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-express': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-fastify': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-pg': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-redis': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-axios': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-winston': {
          enabled: false,
        },
      }),
      // Manual instrumentations with custom configuration
      new NestInstrumentation(),
      new HttpInstrumentation({
        requestHook: (span, request) => {
          span.setAttributes({
            'http.request.method': request.method || 'GET',
            'http.request.url': request.url || '',
            'http.request.headers.user-agent': request.headers?.['user-agent'] || '',
          });
        },
        responseHook: (span, response) => {
          span.setAttributes({
            'http.response.status_code': response.statusCode || 0,
            'http.response.headers.content-type': response.headers?.['content-type'] || '',
          });
        },
      }),
      new ExpressInstrumentation(),
      new FastifyInstrumentation(),
      new PgInstrumentation({
        enhancedDatabaseReporting: true,
        responseHook: (span, response) => {
          if (response?.command) {
            span.setAttributes({
              'db.operation': response.command,
              'db.rows_affected': response.rowCount || 0,
            });
          }
        },
      }),
      new RedisInstrumentation(),
      new AxiosInstrumentation({
        requestHook: (span, request) => {
          span.setAttributes({
            'http.request.method': request.method?.toUpperCase() || 'GET',
            'http.request.url': request.url || '',
            'service.name': 'external-api',
          });
        },
        responseHook: (span, response) => {
          span.setAttributes({
            'http.response.status_code': response.status || 0,
            'http.response.status_text': response.statusText || '',
          });
        },
      }),
      new WinstonInstrumentation(),
    ],
  });

  return sdk;
}

function createTraceExporter(config: TracingConfig) {
  if (config.exporters.jaeger?.enabled) {
    return new JaegerExporter({
      endpoint: config.exporters.jaeger.endpoint,
    });
  }

  if (config.exporters.zipkin?.enabled) {
    return new ZipkinExporter({
      url: config.exporters.zipkin.endpoint,
    });
  }

  if (config.exporters.otlp?.enabled) {
    return new OTLPTraceExporter({
      url: config.exporters.otlp.endpoint,
    });
  }

  // Default to console exporter for development
  return new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  });
}
