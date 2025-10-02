import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

/**
 * Initialize OpenTelemetry tracing for the StrellerMinds backend service
 * This function should be called at the very beginning of the application
 * before any other imports or application logic
 */
export function initTracing(): void {
  console.log('🔍 Initializing OpenTelemetry tracing...');

  // Create resource with service information
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'strellerminds-backend',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  });

  // Configure OTLP trace exporter to send traces to Jaeger
  const traceExporter = new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
    headers: {},
  });

  // Initialize the Node SDK
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      // Auto-instrumentations for common libraries
      getNodeAutoInstrumentations({
        // Configure automatic instrumentations
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable file system instrumentation to reduce noise
        },
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-fastify': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-redis': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-axios': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-winston': {
          enabled: true,
        },
      }),

      // Explicit HTTP instrumentation with enhanced configuration
      new HttpInstrumentation({
        enabled: true,
        requestHook: (span, request) => {
          // Add custom attributes to HTTP requests
          span.setAttributes({
            'http.request.method': request.method || 'GET',
            'http.request.url': request.url || '',
            'http.request.headers.user-agent': request.headers?.['user-agent'] || '',
          });
        },
        responseHook: (span, response) => {
          // Add custom attributes to HTTP responses
          span.setAttributes({
            'http.response.status_code': response.statusCode || 0,
            'http.response.headers.content-type': response.headers?.['content-type'] || '',
          });
        },
        // Ignore health check endpoints to reduce noise
        ignoreIncomingRequestHook: (req) => {
          return req.url?.includes('/health') || req.url?.includes('/metrics');
        },
      }),

      // Explicit PostgreSQL instrumentation with enhanced configuration
      new PgInstrumentation({
        enabled: true,
        enhancedDatabaseReporting: true,
        requestHook: (span, request) => {
          // Add custom attributes to database requests
          span.setAttributes({
            'db.system': 'postgresql',
            'db.operation': request.text?.split(' ')[0]?.toLowerCase() || 'query',
            'db.statement': request.text || '',
          });
        },
        responseHook: (span, response) => {
          // Add custom attributes to database responses
          if (response?.command) {
            span.setAttributes({
              'db.operation': response.command,
              'db.rows_affected': response.rowCount || 0,
            });
          }
        },
        // Ignore connection pool queries to reduce noise
        ignoreIncomingRequestHook: (request) => {
          return (
            request.text?.includes('pg_stat_activity') ||
            request.text?.includes('pg_database') ||
            request.text?.trim() === 'BEGIN' ||
            request.text?.trim() === 'COMMIT'
          );
        },
      }),
    ],
  });

  // Initialize the SDK and register with the OpenTelemetry API
  sdk.start();

  console.log('✅ OpenTelemetry tracing initialized successfully');
  console.log('📊 Service: strellerminds-backend');
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔗 Jaeger UI: http://localhost:16686');
  console.log('📡 OTLP Endpoint: http://localhost:4318/v1/traces');

  // Gracefully shut down the SDK on process exit
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('✅ OpenTelemetry tracing shutdown complete'))
      .catch((error) => console.log('❌ Error shutting down OpenTelemetry tracing:', error))
      .finally(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    sdk
      .shutdown()
      .then(() => console.log('✅ OpenTelemetry tracing shutdown complete'))
      .catch((error) => console.log('❌ Error shutting down OpenTelemetry tracing:', error))
      .finally(() => process.exit(0));
  });
}
