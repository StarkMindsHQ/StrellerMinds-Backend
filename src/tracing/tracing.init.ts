import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';

// Initialize tracing before any other imports
export function initializeTracing() {
  const serviceName = process.env.TRACING_SERVICE_NAME || 'strellerminds-backend';
  const serviceVersion = process.env.TRACING_SERVICE_VERSION || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
  });

  // Determine which exporter to use
  let traceExporter;

  if (process.env.TRACING_JAEGER_ENABLED === 'true') {
    traceExporter = new JaegerExporter({
      endpoint: process.env.TRACING_JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    });
    console.log('🔍 Initializing Jaeger tracing...');
  } else if (process.env.TRACING_ZIPKIN_ENABLED === 'true') {
    traceExporter = new ZipkinExporter({
      url: process.env.TRACING_ZIPKIN_ENDPOINT || 'http://localhost:9411/api/v2/spans',
    });
    console.log('🔍 Initializing Zipkin tracing...');
  } else if (process.env.TRACING_OTLP_ENABLED === 'true') {
    traceExporter = new OTLPTraceExporter({
      url: process.env.TRACING_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    });
    console.log('🔍 Initializing OTLP tracing...');
  } else {
    console.log('⚠️ Tracing is disabled');
    return;
  }

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable some instrumentations that might cause issues
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
  });

  // Initialize the SDK and register with the OpenTelemetry API
  sdk.start();

  console.log('✅ OpenTelemetry tracing initialized successfully');
  console.log(`📊 Service: ${serviceName} v${serviceVersion}`);
  console.log(`🌍 Environment: ${environment}`);

  // Gracefully shut down the SDK on process exit
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('✅ OpenTelemetry tracing shutdown complete'))
      .catch((error) => console.log('❌ Error shutting down OpenTelemetry tracing', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}

// Auto-initialize if tracing is enabled
if (process.env.TRACING_ENABLED === 'true') {
  initializeTracing();
}
