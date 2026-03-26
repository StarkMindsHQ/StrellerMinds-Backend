import { ConfigService } from '@nestjs/config';

/**
 * APM Configuration
 * Configuration for all APM providers (DataDog, New Relic, Sentry)
 */
export interface APMConfig {
  datadog: {
    enabled: boolean;
    apiKey?: string;
    appName: string;
    env: string;
    version: string;
    samplingRate: number;
    logInjection: boolean;
    enableMetrics: boolean;
    enableProfiling: boolean;
    traceBufferSize: number;
  };
  newrelic: {
    enabled: boolean;
    licenseKey?: string;
    appName: string;
    env: string;
    version: string;
    samplingRate: number;
    enableMetrics: boolean;
    enableEvents: boolean;
  };
  sentry: {
    enabled: boolean;
    dsn?: string;
    env: string;
    tracesSampleRate: number;
    enableProfiling: boolean;
  };
  tracing: {
    enabled: boolean;
    spanBufferSize: number;
    cleanupIntervalMs: number;
    exportIntervalMs: number;
  };
  profiling: {
    enabled: boolean;
    profilingIntervalMs: number;
    memoryProfiler: {
      enabled: boolean;
      heapSnapshotInterval: number; // ms
    };
    cpuProfiler: {
      enabled: boolean;
      samplingInterval: number; // ms
    };
  };
  alerting: {
    enabled: boolean;
    highMemoryThreshold: number; // % of heap
    highCpuThreshold: number; // %
    slowResponseThreshold: number; // ms
    errorRateThreshold: number; // %
    dbLatencyThreshold: number; // ms
    cacheMissRateThreshold: number; // %
    memoryLeakDetectionEnabled: boolean;
    slackWebhookUrl?: string;
    pagerDutyIntegrationKey?: string;
  };
}

/**
 * Get APM configuration from environment variables
 */
export function getAPMConfig(configService: ConfigService): APMConfig {
  return {
    datadog: {
      enabled: !!configService.get('DATADOG_API_KEY'),
      apiKey: configService.get('DATADOG_API_KEY'),
      appName: configService.get('APP_NAME', 'strellerminds-backend'),
      env: configService.get('NODE_ENV', 'development'),
      version: configService.get('APP_VERSION', '1.0.0'),
      samplingRate: parseFloat(configService.get('DATADOG_SAMPLING_RATE', '0.1')),
      logInjection: configService.get('DATADOG_LOG_INJECTION', 'true') === 'true',
      enableMetrics: configService.get('DATADOG_METRICS_ENABLED', 'true') === 'true',
      enableProfiling: configService.get('DATADOG_PROFILING_ENABLED', 'false') === 'true',
      traceBufferSize: parseInt(configService.get('DATADOG_TRACE_BUFFER_SIZE', '1000'), 10),
    },
    newrelic: {
      enabled: !!configService.get('NEW_RELIC_LICENSE_KEY'),
      licenseKey: configService.get('NEW_RELIC_LICENSE_KEY'),
      appName: configService.get('APP_NAME', 'strellerminds-backend'),
      env: configService.get('NODE_ENV', 'development'),
      version: configService.get('APP_VERSION', '1.0.0'),
      samplingRate: parseFloat(configService.get('NEW_RELIC_SAMPLING_RATE', '0.1')),
      enableMetrics: configService.get('NEW_RELIC_METRICS_ENABLED', 'true') === 'true',
      enableEvents: configService.get('NEW_RELIC_EVENTS_ENABLED', 'true') === 'true',
    },
    sentry: {
      enabled: !!configService.get('SENTRY_DSN'),
      dsn: configService.get('SENTRY_DSN'),
      env: configService.get('NODE_ENV', 'development'),
      tracesSampleRate: parseFloat(configService.get('SENTRY_TRACES_SAMPLE_RATE', '1.0')),
      enableProfiling: configService.get('SENTRY_PROFILING_ENABLED', 'false') === 'true',
    },
    tracing: {
      enabled: configService.get('TRACING_ENABLED', 'true') === 'true',
      spanBufferSize: parseInt(configService.get('TRACING_SPAN_BUFFER_SIZE', '10000'), 10),
      cleanupIntervalMs: parseInt(configService.get('TRACING_CLEANUP_INTERVAL_MS', '3600000'), 10),
      exportIntervalMs: parseInt(configService.get('TRACING_EXPORT_INTERVAL_MS', '60000'), 10),
    },
    profiling: {
      enabled: configService.get('PROFILING_ENABLED', 'true') === 'true',
      profilingIntervalMs: parseInt(configService.get('PROFILING_INTERVAL_MS', '60000'), 10),
      memoryProfiler: {
        enabled: configService.get('MEMORY_PROFILER_ENABLED', 'true') === 'true',
        heapSnapshotInterval: parseInt(
          configService.get('HEAP_SNAPSHOT_INTERVAL_MS', '3600000'),
          10,
        ),
      },
      cpuProfiler: {
        enabled: configService.get('CPU_PROFILER_ENABLED', 'true') === 'true',
        samplingInterval: parseInt(configService.get('CPU_SAMPLING_INTERVAL_MS', '1000'), 10),
      },
    },
    alerting: {
      enabled: configService.get('ALERTING_ENABLED', 'true') === 'true',
      highMemoryThreshold: parseInt(configService.get('ALERT_MEMORY_THRESHOLD', '85'), 10),
      highCpuThreshold: parseInt(configService.get('ALERT_CPU_THRESHOLD', '80'), 10),
      slowResponseThreshold: parseInt(configService.get('ALERT_RESPONSE_TIME_THRESHOLD', '5000'), 10),
      errorRateThreshold: parseFloat(configService.get('ALERT_ERROR_RATE_THRESHOLD', '5.0')),
      dbLatencyThreshold: parseInt(configService.get('ALERT_DB_LATENCY_THRESHOLD', '1000'), 10),
      cacheMissRateThreshold: parseInt(configService.get('ALERT_CACHE_MISS_THRESHOLD', '30'), 10),
      memoryLeakDetectionEnabled:
        configService.get('MEMORY_LEAK_DETECTION_ENABLED', 'true') === 'true',
      slackWebhookUrl: configService.get('SLACK_WEBHOOK_URL'),
      pagerDutyIntegrationKey: configService.get('PAGERDUTY_INTEGRATION_KEY'),
    },
  };
}

/**
 * Validate APM configuration
 */
export function validateAPMConfig(config: APMConfig): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!config.datadog.enabled && !config.newrelic.enabled && !config.sentry.enabled) {
    warnings.push(
      'No APM providers configured. Set DATADOG_API_KEY, NEW_RELIC_LICENSE_KEY, or SENTRY_DSN.',
    );
  }

  if (config.datadog.enabled && !config.datadog.apiKey) {
    warnings.push('DataDog is enabled but DATADOG_API_KEY is not set.');
  }

  if (config.newrelic.enabled && !config.newrelic.licenseKey) {
    warnings.push('New Relic is enabled but NEW_RELIC_LICENSE_KEY is not set.');
  }

  if (config.sentry.enabled && !config.sentry.dsn) {
    warnings.push('Sentry is enabled but SENTRY_DSN is not set.');
  }

  if (config.profiling.enabled && config.profiling.profilingIntervalMs < 10000) {
    warnings.push('Profiling interval is very short, which may impact performance.');
  }

  if (
    config.alerting.highMemoryThreshold > 95 ||
    config.alerting.highMemoryThreshold < 50
  ) {
    warnings.push('Memory threshold is outside recommended range (50-95).');
  }

  return {
    valid: true,
    warnings,
  };
}
