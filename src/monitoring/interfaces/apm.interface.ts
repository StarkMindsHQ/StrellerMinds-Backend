export interface Transaction {
  id: string;
  name: string;
  type: 'http' | 'database' | 'cache' | 'external' | 'background';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'success' | 'error' | 'timeout';
  metadata?: Record<string, any>;
  children?: Transaction[];
}

export interface PerformanceSnapshot {
  timestamp: Date;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpu: {
    user: number;
    system: number;
    percentage: number;
  };
  eventLoop: {
    delay: number;
    utilization: number;
  };
  activeHandles: number;
  activeRequests: number;
}

export interface QueryAnalysis {
  query: string;
  duration: number;
  rows: number;
  plan?: any;
  indexes?: string[];
  recommendations?: string[];
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  evictions: number;
  operations: {
    get: number;
    set: number;
    delete: number;
  };
}

export interface PerformanceThresholds {
  responseTime: {
    p50: number; // milliseconds
    p95: number;
    p99: number;
  };
  errorRate: number; // percentage
  throughput: number; // requests per second
  memoryUsage: number; // percentage
  cpuUsage: number; // percentage
  databaseQueryTime: number; // milliseconds
  cacheHitRate: number; // percentage
}
