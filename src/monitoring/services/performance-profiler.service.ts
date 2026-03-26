import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import * as v8 from 'v8';

/**
 * Memory snapshot
 */
export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  percentageUsed: number;
}

/**
 * CPU profile
 */
export interface CpuProfile {
  timestamp: number;
  user: number;
  system: number;
  percentageUsed: number;
  samples: number;
}

/**
 * Performance hotspot
 */
export interface HotSpot {
  operation: string;
  count: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  percentageOfTotal: number;
}

/**
 * Performance Profile
 */
export interface PerformanceProfile {
  timestamp: number;
  duration: number;
  memory: MemorySnapshot;
  cpu: CpuProfile;
  hotspots: HotSpot[];
  gcCount: number;
  pauseTime: number;
}

/**
 * Performance Profiler Service
 * Implements detailed performance profiling and analysis
 */
@Injectable()
export class PerformanceProfilerService {
  private readonly logger = new Logger(PerformanceProfilerService.name);
  private profiles: PerformanceProfile[] = [];
  private operationMetrics = new Map<string, Array<{ time: number; timestamp: number }>>();
  private lastCpuUsage = process.cpuUsage();
  private memorySnapshots: MemorySnapshot[] = [];
  private readonly maxProfiles = 100;
  private readonly maxMetricsPerOperation = 10000;
  private lastGCCount = 0;
  private startTime = Date.now();

  constructor() {
    this.initializeGCTracking();
    this.startPeriodicProfiling();
  }

  /**
   * Initialize GC tracking (if available)
   */
  private initializeGCTracking(): void {
    try {
      const gc = require('gc');
      if (gc) {
        this.logger.log('GC tracking enabled');
      }
    } catch (error) {
      this.logger.debug('GC tracking not available, run with --expose-gc flag');
    }
  }

  /**
   * Start periodic profiling
   */
  private startPeriodicProfiling(): void {
    setInterval(() => {
      this.captureProfile();
    }, 60000); // Every minute
  }

  /**
   * Record operation timing
   */
  recordOperation(operation: string, durationMs: number): void {
    if (!this.operationMetrics.has(operation)) {
      this.operationMetrics.set(operation, []);
    }

    const metrics = this.operationMetrics.get(operation)!;
    metrics.push({ time: durationMs, timestamp: Date.now() });

    // Maintain size limit
    if (metrics.length > this.maxMetricsPerOperation) {
      metrics.shift();
    }
  }

  /**
   * Capture memory snapshot
   */
  captureMemorySnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0,
      percentageUsed: (memUsage.heapUsed / memUsage.heapTotal) * 100,
    };

    this.memorySnapshots.push(snapshot);
    if (this.memorySnapshots.length > this.maxProfiles) {
      this.memorySnapshots.shift();
    }

    return snapshot;
  }

  /**
   * Capture CPU profile
   */
  captureCpuProfile(): CpuProfile {
    const cpuUsage = process.cpuUsage();
    const lastUsage = this.lastCpuUsage;

    const userDiff = cpuUsage.user - lastUsage.user;
    const systemDiff = cpuUsage.system - lastUsage.system;
    const totalDiff = userDiff + systemDiff;

    const profile: CpuProfile = {
      timestamp: Date.now(),
      user: userDiff,
      system: systemDiff,
      percentageUsed: (totalDiff / 1000000) * 100, // Convert to percentage
      samples: 1,
    };

    this.lastCpuUsage = cpuUsage;
    return profile;
  }

  /**
   * Get hotspots from operation metrics
   */
  private getHotspots(): HotSpot[] {
    const hotspots: HotSpot[] = [];
    let totalTime = 0;

    const operationStats = Array.from(this.operationMetrics.entries()).map(([operation, metrics]) => {
      const times = metrics.map((m) => m.time);
      const total = times.reduce((a, b) => a + b, 0);
      totalTime += total;

      return {
        operation,
        count: metrics.length,
        totalTime: total,
        avgTime: total / metrics.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        percentageOfTotal: 0, // Will be calculated below
      };
    });

    // Sort by total time and get top hotspots
    operationStats.sort((a, b) => b.totalTime - a.totalTime);

    operationStats.slice(0, 20).forEach((stat) => {
      hotspots.push({
        ...stat,
        percentageOfTotal: totalTime > 0 ? (stat.totalTime / totalTime) * 100 : 0,
      });
    });

    return hotspots;
  }

  /**
   * Capture full performance profile
   */
  captureProfile(): PerformanceProfile {
    const startTime = Date.now();
    const memory = this.captureMemorySnapshot();
    const cpu = this.captureCpuProfile();
    const hotspots = this.getHotspots();

    // Estimate GC impact (requires --expose-gc flag)
    const gcCount = this.estimateGCCount();
    const pauseTime = this.estimateGCPauseTime();

    const profile: PerformanceProfile = {
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      memory,
      cpu,
      hotspots,
      gcCount: gcCount - this.lastGCCount,
      pauseTime,
    };

    this.lastGCCount = gcCount;
    this.profiles.push(profile);

    // Maintain size limit
    if (this.profiles.length > this.maxProfiles) {
      this.profiles.shift();
    }

    return profile;
  }

  /**
   * Estimate GC count (requires --expose-gc flag)
   */
  private estimateGCCount(): number {
    try {
      const gc = require('gc');
      if (typeof gc.count === 'function') {
        return gc.count();
      }
    } catch (error) {
      // GC tracking not available
    }
    return 0;
  }

  /**
   * Estimate GC pause time
   */
  private estimateGCPauseTime(): number {
    // This is a simplified estimation
    // In production, use node-inspect-heap or native modules for accurate GC metrics
    const heapUsed = process.memoryUsage().heapUsed;
    const heapTotal = process.memoryUsage().heapTotal;
    const usageRatio = heapUsed / heapTotal;

    // Rough estimation: more heap usage = more GC pause time
    if (usageRatio > 0.9) {
      return 100; // High usage = estimated 100ms GC pause
    } else if (usageRatio > 0.7) {
      return 50;
    }
    return 10;
  }

  /**
   * Get memory trend
   */
  getMemoryTrend(lastN: number = 10): MemorySnapshot[] {
    return this.memorySnapshots.slice(-lastN);
  }

  /**
   * Get latest profile
   */
  getLatestProfile(): PerformanceProfile | undefined {
    return this.profiles[this.profiles.length - 1];
  }

  /**
   * Get all profiles
   */
  getProfiles(limit: number = 10): PerformanceProfile[] {
    return this.profiles.slice(-limit);
  }

  /**
   * Get operation statistics
   */
  getOperationStats(operation: string): {
    count: number;
    totalTime: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.operationMetrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const times = metrics.map((m) => m.time).sort((a, b) => a - b);
    const total = times.reduce((a, b) => a + b, 0);

    return {
      count: metrics.length,
      totalTime: total,
      avgTime: total / times.length,
      minTime: times[0],
      maxTime: times[times.length - 1],
      p50: times[Math.floor(times.length * 0.5)],
      p95: times[Math.floor(times.length * 0.95)],
      p99: times[Math.floor(times.length * 0.99)],
    };
  }

  /**
   * Get all operation statistics
   */
  getAllOperationStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [operation] of this.operationMetrics) {
      stats[operation] = this.getOperationStats(operation);
    }
    return stats;
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeaks(): {
    isLeaking: boolean;
    trend: number;
    warning: string | null;
  } {
    if (this.memorySnapshots.length < 10) {
      return {
        isLeaking: false,
        trend: 0,
        warning: 'Not enough data for leak detection',
      };
    }

    const recent = this.memorySnapshots.slice(-10);
    const avgOld = recent.slice(0, 5).reduce((a, s) => a + s.heapUsed, 0) / 5;
    const avgNew = recent.slice(-5).reduce((a, s) => a + s.heapUsed, 0) / 5;
    const trend = ((avgNew - avgOld) / avgOld) * 100;

    return {
      isLeaking: trend > 20, // > 20% increase indicates potential leak
      trend,
      warning: trend > 20 ? `Memory usage increased by ${trend.toFixed(2)}%` : null,
    };
  }

  /**
   * Generate profiling report
   */
  generateReport(): {
    timestamp: number;
    uptime: number;
    memory: any;
    cpu: any;
    hotspots: HotSpot[];
    memoryLeakAlert: any;
  } {
    const latestMemory = this.captureMemorySnapshot();
    const latestCpu = this.captureCpuProfile();
    const hotspots = this.getHotspots();
    const memoryLeakAlert = this.detectMemoryLeaks();

    return {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      memory: {
        heapUsed: latestMemory.heapUsed,
        heapTotal: latestMemory.heapTotal,
        percentageUsed: latestMemory.percentageUsed,
        rss: latestMemory.rss,
      },
      cpu: {
        user: latestCpu.user,
        system: latestCpu.system,
        percentageUsed: latestCpu.percentageUsed,
      },
      hotspots,
      memoryLeakAlert,
    };
  }

  /**
   * Reset profiler data
   */
  reset(): void {
    this.profiles = [];
    this.operationMetrics.clear();
    this.memorySnapshots = [];
    this.startTime = Date.now();
    this.logger.log('Performance profiler reset');
  }
}
