import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';

@Injectable()
export class DynamicPoolSizingService {
  private readonly logger = new Logger(DynamicPoolSizingService.name);

  constructor(private readonly configService: ConfigService) {}

  calculateOptimalPoolSize(): { min: number; max: number } {
    const cpuCount = os.cpus().length;
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    const max = isProduction ? Math.min(cpuCount * 4, 50) : 5;
    const min = Math.max(1, Math.floor(max * 0.2));

    this.logger.log(`Calculated pool size - Min: ${min}, Max: ${max} (CPUs: ${cpuCount})`);

    return { min, max };
  }

  getRecommendedPoolSize(currentLoad: number): number {
    const { min, max } = this.calculateOptimalPoolSize();
    
    if (currentLoad < 0.5) return min;
    if (currentLoad > 0.8) return max;
    
    return Math.floor(min + (max - min) * currentLoad);
  }
}
