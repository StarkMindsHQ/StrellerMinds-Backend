import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// instrumentations
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { TypeORMInstrumentation } from '@opentelemetry/instrumentation-typeorm';
import { BullInstrumentation } from '@opentelemetry/instrumentation-bull';
import { AxiosInstrumentation } from '@opentelemetry/instrumentation-axios';

// exporters
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';

function getExporterByEnv() {
  const exporter = process.env.OTEL_EXPORTER?.toLowerCase() || 'otlp';
  if (exporter === 'jaeger') {
    return new JaegerExporter({
      endpoint: process.env.OTEL_JAEGER_ENDPOINT || undefined, // optional
    });
  }
  if (exporter === 'zipkin') {
    return new ZipkinExporter({
      url: process.env.OTEL_COLLECTOR_URL || 'http://localhost:9411/api/v2/spans',
    });
  }
  // default otlp http
  return new OTLPTraceExporter({
    url: process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces',
  });
}

export async function setupTracing() {
  // helpful diagnostics (disable in prod)
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]:
        process.env.OTEL_SERVICE_NAME || 'streller-minds-backend',
      ...(process.env.OTEL_RESOURCE_ATTRIBUTES
        ? Object.fromEntries(
            process.env.OTEL_RESOURCE_ATTRIBUTES.split(',').map((p) => p.split('=')),
          )
        : {}),
    }),
    traceExporter: getExporterByEnv(),
    instrumentations: [
      new HttpInstrumentation(), // captures http(s) - incoming & outgoing low-level
      new ExpressInstrumentation(), // captures express route names
      new TypeORMInstrumentation({ moduleVersionAttributeName: 'typeorm.version' }),
      new BullInstrumentation(),
      new AxiosInstrumentation({
        // Axios instrumentation automatically instruments axios requests
        ignoreOutgoingUrls: [], // optionally list
      }),
    ],
    sampler: undefined, // NodeSDK uses env vars for sampler; we can configure below:
  });

  // configure sampling probability via env variable (Simple/Parent-based etc.)
  const prob = Number(process.env.OTEL_SAMPLER_PROBABILITY ?? '1.0');
  if (!isNaN(prob)) {
    // Node SDK reads OTEL_TRACES_SAMPLER and OTEL_TRACES_SAMPLER_ARG env vars if needed.
    // For a basic setup you can set OTEL_TRACES_SAMPLER=parentbased_traceidratio and OTEL_TRACES_SAMPLER_ARG=0.1
    if (!process.env.OTEL_TRACES_SAMPLER) {
      process.env.OTEL_TRACES_SAMPLER = 'traceidratio';
      process.env.OTEL_TRACES_SAMPLER_ARG = String(prob);
    }
  }

  try {
    await sdk.start();
    diag.info('OpenTelemetry SDK started');
  } catch (err) {
    diag.error('Error starting OpenTelemetry', err);
  }

  // shutdown on process end
  const shutdown = async () => {
    try {
      await sdk.shutdown();
      diag.info('OpenTelemetry SDK shut down');
    } catch (err) {
      diag.error('Error shutting down OpenTelemetry', err);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
