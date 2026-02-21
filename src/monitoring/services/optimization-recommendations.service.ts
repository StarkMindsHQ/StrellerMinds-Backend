import { Injectable, Logger } from '@nestjs/common';
import { ApmService } from './apm.service';
import { DatabaseOptimizationService } from './database-optimization.service';
import { CacheOptimizationService } from './cache-optimization.service';
import { PerformanceAnalyticsService } from './performance-analytics.service';
import { OptimizationRecommendationDto } from '../dto/performance.dto';

@Injectable()
export class OptimizationRecommendationsService {
  private readonly logger = new Logger(OptimizationRecommendationsService.name);

  constructor(
    private apmService: ApmService,
    private databaseOptimization: DatabaseOptimizationService,
    private cacheOptimization: CacheOptimizationService,
    private analyticsService: PerformanceAnalyticsService,
  ) {}

  /**
   * Get comprehensive optimization recommendations
   */
  async getRecommendations(): Promise<OptimizationRecommendationDto[]> {
    const recommendations: OptimizationRecommendationDto[] = [];

    const [currentMetrics, cacheMetrics, dbStats, endpointPerformance] = await Promise.all([
      this.apmService.getCurrentMetrics(),
      this.cacheOptimization.getCacheMetrics(),
      this.databaseOptimization.getOptimizationStats(),
      this.analyticsService.getEndpointPerformance({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date(),
      }),
    ]);

    // Response time recommendations
    if (currentMetrics.averageResponseTime > 300) {
      recommendations.push({
        category: 'Response Time',
        priority: currentMetrics.averageResponseTime > 1000 ? 'critical' : 'high',
        description: `Average response time is ${Math.round(currentMetrics.averageResponseTime)}ms, exceeding optimal threshold`,
        impact: 'User experience degradation, potential timeout issues',
        action: 'Optimize slow endpoints, implement caching, review database queries',
        estimatedImprovement: '20-40% reduction in response time',
      });
    }

    // Error rate recommendations
    if (currentMetrics.errorRate > 1) {
      recommendations.push({
        category: 'Reliability',
        priority: currentMetrics.errorRate > 5 ? 'critical' : 'high',
        description: `Error rate is ${currentMetrics.errorRate.toFixed(2)}%, above acceptable threshold`,
        impact: 'Service reliability issues, user frustration',
        action: 'Investigate error sources, improve error handling, add retry logic',
        estimatedImprovement: 'Reduce error rate to <1%',
      });
    }

    // Cache recommendations
    if (cacheMetrics.overall.hitRate < 70) {
      recommendations.push({
        category: 'Caching',
        priority: cacheMetrics.overall.hitRate < 50 ? 'high' : 'medium',
        description: `Cache hit rate is ${cacheMetrics.overall.hitRate.toFixed(1)}%, below optimal 70%`,
        impact: 'Increased database load, slower response times',
        action: 'Review cache TTL settings, increase cache size, implement cache warming',
        estimatedImprovement: `Improve hit rate to 70%+ (${Math.round(70 - cacheMetrics.overall.hitRate)}% improvement)`,
      });
    }

    // Database recommendations
    if (dbStats.pending > 10) {
      recommendations.push({
        category: 'Database',
        priority: 'medium',
        description: `${dbStats.pending} pending query optimizations available`,
        impact: 'Potential performance improvements',
        action: 'Review and apply pending optimizations, create missing indexes',
        estimatedImprovement: '20-50% query performance improvement',
      });
    }

    // Memory recommendations
    if (currentMetrics.memoryUsage > 85) {
      recommendations.push({
        category: 'Memory',
        priority: currentMetrics.memoryUsage > 95 ? 'critical' : 'high',
        description: `Memory usage is ${currentMetrics.memoryUsage.toFixed(1)}%, approaching limits`,
        impact: 'Potential memory-related crashes, performance degradation',
        action: 'Optimize memory usage, clear unused cache, consider increasing memory limit',
        estimatedImprovement: 'Prevent crashes, improve stability',
      });
    }

    // CPU recommendations
    if (currentMetrics.cpuUsage > 80) {
      recommendations.push({
        category: 'CPU',
        priority: currentMetrics.cpuUsage > 90 ? 'critical' : 'high',
        description: `CPU usage is ${currentMetrics.cpuUsage.toFixed(1)}%, high load detected`,
        impact: 'Slower request processing, potential timeouts',
        action: 'Optimize heavy operations, consider horizontal scaling, review background jobs',
        estimatedImprovement: 'Distribute load, improve throughput',
      });
    }

    // Slow endpoint recommendations
    const slowEndpoints = endpointPerformance.filter((ep) => ep.averageDuration > 500).slice(0, 5);
    if (slowEndpoints.length > 0) {
      slowEndpoints.forEach((endpoint) => {
        recommendations.push({
          category: 'Endpoints',
          priority: endpoint.averageDuration > 1000 ? 'high' : 'medium',
          description: `${endpoint.method} ${endpoint.endpoint} has average response time of ${Math.round(endpoint.averageDuration)}ms`,
          impact: 'User experience degradation for this endpoint',
          action: 'Optimize endpoint logic, add caching, review database queries',
          estimatedImprovement: `Reduce response time by 30-50%`,
        });
      });
    }

    // Throughput recommendations
    if (currentMetrics.throughput < 50) {
      recommendations.push({
        category: 'Throughput',
        priority: 'medium',
        description: `Throughput is ${currentMetrics.throughput.toFixed(2)} req/s, below optimal`,
        impact: 'Limited capacity, potential bottlenecks',
        action: 'Optimize request processing, implement connection pooling, review rate limits',
        estimatedImprovement: 'Increase throughput by 50-100%',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
    });
  }

  /**
   * Get recommendations by category
   */
  async getRecommendationsByCategory(category: string): Promise<OptimizationRecommendationDto[]> {
    const allRecommendations = await this.getRecommendations();
    return allRecommendations.filter((r) => r.category.toLowerCase() === category.toLowerCase());
  }

  /**
   * Get high priority recommendations
   */
  async getHighPriorityRecommendations(): Promise<OptimizationRecommendationDto[]> {
    const allRecommendations = await this.getRecommendations();
    return allRecommendations.filter((r) => r.priority === 'high' || r.priority === 'critical');
  }

  /**
   * Get implementation plan for recommendations
   */
  async getImplementationPlan(): Promise<{
    immediate: OptimizationRecommendationDto[];
    shortTerm: OptimizationRecommendationDto[];
    longTerm: OptimizationRecommendationDto[];
  }> {
    const recommendations = await this.getRecommendations();

    return {
      immediate: recommendations.filter((r) => r.priority === 'critical'),
      shortTerm: recommendations.filter((r) => r.priority === 'high'),
      longTerm: recommendations.filter((r) => r.priority === 'medium' || r.priority === 'low'),
    };
  }
}
