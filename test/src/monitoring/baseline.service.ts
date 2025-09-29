import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { MetricsService } from './metrics-service';

export interface PerformanceBaseline {
  id?: string;
  name: string;
  description?: string;
  version: string;
  createdAt: Date;
  endpoints: EndpointBaseline[];
  system: SystemBaseline;
  database: DatabaseBaseline;
  metadata: BaselineMetadata;
}

export interface EndpointBaseline {
  endpoint: string;
  method: string;
  expectedResponseTime: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  expectedThroughput: number;
  expectedErrorRate: number;
  sampleSize: number;
}

export interface SystemBaseline {
  expectedMemoryUsage: number;
  expectedCpuUsage: number;
  expectedUptime: number;
  resourceLimits: {
    maxMemoryUsage: number;
    maxCpuUsage: number;
    maxResponseTime: number;
  };
}

export interface DatabaseBaseline {
  expectedConnectionPoolSize: number;
  expectedQueryTime: {
    average: number;
    p95: number;
  };
  expectedConnectionCount: number;
}

export interface BaselineMetadata {
  environment: string;
  applicationVersion: string;
  nodeVersion: string;
  testDuration: number;
  sampleCount: number;
  conditions: string[];
}

@Injectable()
export class BaselineService {
  private readonly logger = new Logger(BaselineService.name);
  private currentBaseline: PerformanceBaseline | null = null;
  private baselineHistory: PerformanceBaseline[] = [];

  constructor(
    private readonly performanceMonitoringService: PerformanceMonitoringService,
    private readonly metricsService: MetricsService,
  ) {
    this.loadExistingBaselines();
  }

  /**
   * Create a new performance baseline
   */
  async createBaseline(
    name: string,
    description?: string,
    version?: string,
  ): Promise<PerformanceBaseline> {
    this.logger.log(`Creating performance baseline: ${name}`);

    const baseline: PerformanceBaseline = {
      name,
      description,
      version: version || this.generateVersion(),
      createdAt: new Date(),
      endpoints: await this.collectEndpointBaselines(),
      system: await this.collectSystemBaseline(),
      database: await this.collectDatabaseBaseline(),
      metadata: await this.collectMetadata(),
    };

    // Store baseline
    this.currentBaseline = baseline;
    this.baselineHistory.push(baseline);

    // Persist to storage (in production, use database)
    await this.persistBaseline(baseline);

    this.logger.log(`Performance baseline created successfully: ${baseline.id}`);
    return baseline;
  }

  /**
   * Get current active baseline
   */
  getCurrentBaseline(): PerformanceBaseline | null {
    return this.currentBaseline;
  }

  /**
   * Compare current performance against baseline
   */
  async compareAgainstBaseline(
    timeWindow: number = 3600000,
  ): Promise<BaselineComparison> {
    if (!this.currentBaseline) {
      throw new Error('No baseline available for comparison');
    }

    this.logger.debug('Comparing current performance against baseline');

    const currentMetrics = this.performanceMonitoringService.getSystemPerformanceSummary(timeWindow);
    
    return {
      baselineName: this.currentBaseline.name,
      baselineVersion: this.currentBaseline.version,
      comparisonTimestamp: new Date().toISOString(),
      timeWindow: timeWindow / 1000,
      endpointComparisons: await this.compareEndpoints(currentMetrics),
      systemComparison: await this.compareSystem(currentMetrics),
      overallAssessment: this.calculateOverallAssessment(currentMetrics),
      recommendations: this.generateComparisonRecommendations(currentMetrics),
    };
  }

  /**
   * Validate if current performance meets baseline standards
   */
  async validateAgainstBaseline(): Promise<BaselineValidation> {
    if (!this.currentBaseline) {
      return {
        isValid: false,
        reason: 'No baseline available',
        violations: [],
      };
    }

    const comparison = await this.compareAgainstBaseline();
    const violations: BaselineViolation[] = [];

    // Check endpoint violations
    comparison.endpointComparisons.forEach(endpoint => {
      if (endpoint.responseTimeDeviation > 50) { // 50% deviation threshold
        violations.push({
          type: 'RESPONSE_TIME_VIOLATION',
          endpoint: endpoint.endpoint,
          expected: endpoint.baseline.expectedResponseTime.p95,
          actual: endpoint.current.p95ResponseTime,
          deviation: endpoint.responseTimeDeviation,
          severity: endpoint.responseTimeDeviation > 100 ? 'CRITICAL' : 'WARNING',
        });
      }

      if (endpoint.errorRateDeviation > 100) { // 100% increase in error rate
        violations.push({
          type: 'ERROR_RATE_VIOLATION',
          endpoint: endpoint.endpoint,
          expected: endpoint.baseline.expectedErrorRate,
          actual: endpoint.current.errorRate,
          deviation: endpoint.errorRateDeviation,
          severity: 'CRITICAL',
        });
      }
    });

    // Check system violations
    if (comparison.systemComparison.memoryUsageDeviation > 25) {
      violations.push({
        type: 'MEMORY_USAGE_VIOLATION',
        expected: this.currentBaseline.system.expectedMemoryUsage,
        actual: comparison.systemComparison.current.memoryUsage,
        deviation: comparison.systemComparison.memoryUsageDeviation,
        severity: comparison.systemComparison.memoryUsageDeviation > 50 ? 'CRITICAL' : 'WARNING',
      });
    }

    return {
      isValid: violations.length === 0,
      violations,
      summary: {
        totalViolations: violations.length,
        criticalViolations: violations.filter(v => v.severity === 'CRITICAL').length,
        warningViolations: violations.filter(v => v.severity === 'WARNING').length,
      },
    };
  }

  /**
   * Scheduled baseline validation
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledBaselineValidation(): Promise<void> {
    if (!this.currentBaseline) {
      this.logger.debug('No baseline available for scheduled validation');
      return;
    }

    try {
      this.logger.debug('Running scheduled baseline validation');
      
      const validation = await this.validateAgainstBaseline();
      
      if (!validation.isValid) {
        this.logger.warn(
          `Baseline validation failed: ${validation.violations.length} violations detected`,
          { violations: validation.violations }
        );
        
        // Send alerts for critical violations
        const criticalViolations = validation.violations.filter(v => v.severity === 'CRITICAL');
        if (criticalViolations.length > 0) {
          // In production, integrate with alerting service
          this.logger.error('Critical baseline violations detected', { criticalViolations });
        }
      } else {
        this.logger.debug('Baseline validation passed');
      }
    } catch (error) {
      this.logger.error('Error in scheduled baseline validation:', error);
    }
  }

  /**
   * Auto-update baseline based on performance trends
   */
  async autoUpdateBaseline(
    thresholdDays: number = 7,
    improvementThreshold: number = 20,
  ): Promise<boolean> {
    if (!this.currentBaseline) {
      this.logger.warn('Cannot auto-update: no current baseline');
      return false;
    }

    const baselineAge = Date.now() - this.currentBaseline.createdAt.getTime();
    const ageInDays = baselineAge / (1000 * 60 * 60 * 24);

    if (ageInDays < thresholdDays) {
      this.logger.debug(`Baseline too recent for auto-update (${ageInDays.toFixed(1)} days)`);
      return false;
    }

    // Check if performance has consistently improved
    const recentComparison = await this.compareAgainstBaseline();
    const overallImprovement = this.calculateOverallImprovement(recentComparison);

    if (overallImprovement > improvementThreshold) {
      this.logger.log(
        `Auto-updating baseline due to ${overallImprovement.toFixed(1)}% improvement`
      );
      
      await this.createBaseline(
        `Auto-updated from ${this.currentBaseline.name}`,
        `Automatically updated due to ${overallImprovement.toFixed(1)}% performance improvement`,
        this.generateVersion()
      );
      
      return true;
    }

    return false;
  }

  // Private helper methods
  private async collectEndpointBaselines(): Promise<EndpointBaseline[]> {
    // In production, collect from actual endpoint performance data
    const criticalEndpoints = [
      { endpoint: '/health', method: 'GET' },
      { endpoint: '/courses', method: 'GET' },
      { endpoint: '/courses/search', method: 'GET' },
      { endpoint: '/auth/login', method: 'POST' },
      { endpoint: '/auth/register', method: 'POST' },
    ];

    const baselines: EndpointBaseline[] = [];

    for (const endpoint of criticalEndpoints) {
      const stats = this.performanceMonitoringService.getEndpointPerformanceStats(
        endpoint.endpoint,
        3600000 // 1 hour window
      );

      if (stats) {
        baselines.push({
          endpoint: endpoint.endpoint,
          method: endpoint.method,
          expectedResponseTime: {
            p50: stats.medianResponseTime,
            p95: stats.p95ResponseTime,
            p99: stats.p99ResponseTime,
            max: stats.maxResponseTime,
          },
          expectedThroughput: stats.throughput,
          expectedErrorRate: stats.errorRate,
          sampleSize: stats.totalRequests,
        });
      }
    }

    return baselines;
  }

  private async collectSystemBaseline(): Promise<SystemBaseline> {
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    return {
      expectedMemoryUsage: memoryUsagePercent,
      expectedCpuUsage: 0, // Placeholder - implement CPU monitoring
      expectedUptime: process.uptime(),
      resourceLimits: {
        maxMemoryUsage: 85, // 85% memory usage limit
        maxCpuUsage: 80, // 80% CPU usage limit
        maxResponseTime: 2000, // 2 second response time limit
      },
    };
  }

  private async collectDatabaseBaseline(): Promise<DatabaseBaseline> {
    // Placeholder - implement actual database metrics collection
    return {
      expectedConnectionPoolSize: 10,
      expectedQueryTime: {
        average: 50,
        p95: 200,
      },
      expectedConnectionCount: 5,
    };
  }

  private async collectMetadata(): Promise<BaselineMetadata> {
    return {
      environment: process.env.NODE_ENV || 'development',
      applicationVersion: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      testDuration: 3600, // 1 hour
      sampleCount: 1000, // Placeholder
      conditions: [
        'Normal load conditions',
        'No active deployments',
        'Stable infrastructure',
      ],
    };
  }

  private async compareEndpoints(currentMetrics: any): Promise<EndpointComparison[]> {
    if (!this.currentBaseline || !currentMetrics.endpointBreakdown) {
      return [];
    }

    return this.currentBaseline.endpoints.map(baseline => {
      const current = currentMetrics.endpointBreakdown.find(
        (e: any) => e.endpoint === baseline.endpoint
      );

      if (!current) {
        return {
          endpoint: baseline.endpoint,
          baseline,
          current: null,
          responseTimeDeviation: 0,
          throughputDeviation: 0,
          errorRateDeviation: 0,
          status: 'NO_DATA',
        };
      }

      const responseTimeDeviation = 
        ((current.avgResponseTime - baseline.expectedResponseTime.p50) / baseline.expectedResponseTime.p50) * 100;
      
      const throughputDeviation = 
        ((baseline.expectedThroughput - current.throughput) / baseline.expectedThroughput) * 100;
      
      const errorRateDeviation = 
        baseline.expectedErrorRate > 0 
          ? ((current.errorRate - baseline.expectedErrorRate) / baseline.expectedErrorRate) * 100
          : current.errorRate > 0 ? 100 : 0;

      return {
        endpoint: baseline.endpoint,
        baseline,
        current,
        responseTimeDeviation,
        throughputDeviation,
        errorRateDeviation,
        status: this.determineEndpointStatus(responseTimeDeviation, errorRateDeviation),
      };
    });
  }

  private async compareSystem(currentMetrics: any): Promise<SystemComparison> {
    if (!this.currentBaseline || !currentMetrics.overallPerformance) {
      return null;
    }

    const currentMemoryUsage = this.getCurrentMemoryUsage();
    const memoryUsageDeviation = 
      ((currentMemoryUsage - this.currentBaseline.system.expectedMemoryUsage) / 
       this.currentBaseline.system.expectedMemoryUsage) * 100;

    return {
      baseline: this.currentBaseline.system,
      current: {
        memoryUsage: currentMemoryUsage,
        cpuUsage: 0, // Placeholder
        uptime: process.uptime(),
      },
      memoryUsageDeviation,
      cpuUsageDeviation: 0, // Placeholder
      status: Math.abs(memoryUsageDeviation) > 25 ? 'DEGRADED' : 'NORMAL',
    };
  }

  private calculateOverallAssessment(currentMetrics: any): string {
    // Simplified assessment logic
    if (!currentMetrics.overallPerformance) return 'UNKNOWN';
    
    const grade = currentMetrics.performanceGrade;
    if (grade === 'A' || grade === 'B') return 'EXCELLENT';
    if (grade === 'C') return 'GOOD';
    if (grade === 'D') return 'FAIR';
    return 'POOR';
  }

  private generateComparisonRecommendations(currentMetrics: any): string[] {
    const recommendations = [];
    
    if (currentMetrics.recommendations) {
      recommendations.push(...currentMetrics.recommendations);
    }
    
    return recommendations;
  }

  private calculateOverallImprovement(comparison: BaselineComparison): number {
    // Simplified improvement calculation
    const endpointImprovements = comparison.endpointComparisons
      .filter(e => e.responseTimeDeviation < 0) // Negative deviation means improvement
      .map(e => Math.abs(e.responseTimeDeviation));
    
    return endpointImprovements.length > 0 
      ? endpointImprovements.reduce((a, b) => a + b, 0) / endpointImprovements.length
      : 0;
  }

  private determineEndpointStatus(responseTimeDeviation: number, errorRateDeviation: number): string {
    if (responseTimeDeviation > 50 || errorRateDeviation > 100) return 'CRITICAL';
    if (responseTimeDeviation > 25 || errorRateDeviation > 50) return 'WARNING';
    return 'NORMAL';
  }

  private getCurrentMemoryUsage(): number {
    const usage = process.memoryUsage();
    return (usage.heapUsed / usage.heapTotal) * 100;
  }

  private generateVersion(): string {
    return `v${Date.now()}`;
  }

  private async persistBaseline(baseline: PerformanceBaseline): Promise<void> {
    // In production, save to database
    // For now, save to file system
    const fs = require('fs');
    const path = require('path');
    
    const baselinesDir = path.join(process.cwd(), 'test', 'performance', 'baselines');
    if (!fs.existsSync(baselinesDir)) {
      fs.mkdirSync(baselinesDir, { recursive: true });
    }
    
    const filename = `baseline-${baseline.version}.json`;
    const filepath = path.join(baselinesDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(baseline, null, 2));
    this.logger.debug(`Baseline persisted to: ${filepath}`);
  }

  private loadExistingBaselines(): void {
    // In production, load from database
    // For now, load from file system
    try {
      const fs = require('fs');
      const path = require('path');
      
      const baselinesDir = path.join(process.cwd(), 'test', 'performance', 'baselines');
      if (fs.existsSync(baselinesDir)) {
        const files = fs.readdirSync(baselinesDir).filter((f: string) => f.endsWith('.json'));
        
        files.forEach((file: string) => {
          try {
            const filepath = path.join(baselinesDir, file);
            const baseline = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            this.baselineHistory.push(baseline);
          } catch (error) {
            this.logger.warn(`Failed to load baseline from ${file}:`, error.message);
          }
        });
        
        // Set most recent as current
        if (this.baselineHistory.length > 0) {
          this.currentBaseline = this.baselineHistory
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          
          this.logger.log(`Loaded current baseline: ${this.currentBaseline.name}`);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load existing baselines:', error.message);
    }
  }
}

// Type definitions for comparison results
export interface BaselineComparison {
  baselineName: string;
  baselineVersion: string;
  comparisonTimestamp: string;
  timeWindow: number;
  endpointComparisons: EndpointComparison[];
  systemComparison: SystemComparison;
  overallAssessment: string;
  recommendations: string[];
}

export interface EndpointComparison {
  endpoint: string;
  baseline: EndpointBaseline;
  current: any;
  responseTimeDeviation: number;
  throughputDeviation: number;
  errorRateDeviation: number;
  status: string;
}

export interface SystemComparison {
  baseline: SystemBaseline;
  current: {
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
  };
  memoryUsageDeviation: number;
  cpuUsageDeviation: number;
  status: string;
}

export interface BaselineValidation {
  isValid: boolean;
  reason?: string;
  violations: BaselineViolation[];
  summary?: {
    totalViolations: number;
    criticalViolations: number;
    warningViolations: number;
  };
}

export interface BaselineViolation {
  type: string;
  endpoint?: string;
  expected: number;
  actual: number;
  deviation: number;
  severity: 'WARNING' | 'CRITICAL';
}
