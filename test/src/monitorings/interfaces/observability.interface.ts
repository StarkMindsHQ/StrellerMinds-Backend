export interface ObservabilityMetrics {
  systemMetrics: SystemMetrics;
  applicationMetrics: ApplicationMetrics;
  customMetrics: Record<string, number>;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIO: NetworkIO;
  uptime: number;
}

export interface ApplicationMetrics {
  requestCount: number;
  responseTime: ResponseTimeMetrics;
  errorRate: number;
  activeConnections: number;
  throughput: number;
}

export interface NetworkIO {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
}

export interface ResponseTimeMetrics {
  average: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

export interface TraceData {
  traceId: string;
  spanId: string;
  operationName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  tags: Record<string, any>;
  logs: LogEntry[];
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  traceId?: string;
}
