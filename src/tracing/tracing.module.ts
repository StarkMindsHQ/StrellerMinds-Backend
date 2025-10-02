import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TracingConfigService, createTracingSDK } from './tracing.config';
import { TracingService } from './tracing.service';
import { TracingInterceptor } from './tracing.interceptor';
import { TracingMiddleware } from './tracing.middleware';
import { TracingGuard } from './tracing.guard';
import { TracedHttpService } from './traced-http.service';
import { TracedDatabaseService } from './traced-database.service';

@Global()
@Module({
  imports: [ConfigModule, HttpModule, TypeOrmModule],
  providers: [
    TracingConfigService,
    TracingService,
    TracingInterceptor,
    TracingMiddleware,
    TracingGuard,
    TracedHttpService,
    TracedDatabaseService,
  ],
  exports: [
    TracingService,
    TracingInterceptor,
    TracingMiddleware,
    TracingGuard,
    TracedHttpService,
    TracedDatabaseService,
  ],
})
export class TracingModule implements OnModuleInit, OnModuleDestroy {
  private sdk: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly tracingConfigService: TracingConfigService,
  ) {}

  async onModuleInit() {
    const config = this.tracingConfigService.getConfig();

    if (this.tracingConfigService.isEnabled()) {
      console.log('🔍 Initializing OpenTelemetry tracing...');

      this.sdk = createTracingSDK(config);
      await this.sdk.start();

      console.log('✅ OpenTelemetry tracing initialized successfully');
      console.log(`📊 Service: ${config.serviceName} v${config.serviceVersion}`);
      console.log(`🌍 Environment: ${config.environment}`);
      console.log(
        `📈 Sampling enabled: ${config.sampling.enabled} (ratio: ${config.sampling.ratio})`,
      );
    } else {
      console.log('⚠️ OpenTelemetry tracing is disabled');
    }
  }

  async onModuleDestroy() {
    if (this.sdk) {
      console.log('🔄 Shutting down OpenTelemetry tracing...');
      await this.sdk.shutdown();
      console.log('✅ OpenTelemetry tracing shutdown complete');
    }
  }
}
