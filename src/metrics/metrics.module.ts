import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { BusinessMetricsService } from './services/business-metrics.service';
import { MetricsController } from './controllers/metrics.controller';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, BusinessMetricsService],
  exports: [MetricsService, BusinessMetricsService],
})
export class MetricsModule {}
