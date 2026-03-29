import { Injectable, Logger } from '@nestjs/common';
import { CorrelationLoggerService } from './correlation-logger.service';

/**
 * Log Record Interface
 */
interface LogRecord {
  timestamp: string;
  level: string;
  message: string;
  correlationId?: string;
  traceId?: string;
  tags?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Log Analysis Interface
 */
interface AnalysisResult {
  anomalyDetected: boolean;
  patterns: Record<string, number>;
  correlations: string[];
  anomalies: string[];
  recommendations: string[];
}

/**
 * Log Analyzer Service
 * Analyzes application logs for patterns, anomalies, and performance metrics
 */
@Injectable()
export class LogAnalyzer {
  private readonly logger = new Logger(LogAnalyzer.name);
  private recentLogs: LogRecord[] = [];
  private readonly MAX_LOGS_FOR_ANALYSIS = 1000;

  constructor(private readonly correlationLogger: CorrelationLoggerService) {}

  /**
   * Track a log record for analysis
   */
  track(record: LogRecord): void {
    this.recentLogs.push(record);
    if (this.recentLogs.length > this.MAX_LOGS_FOR_ANALYSIS) {
      this.recentLogs.shift();
    }
  }

  /**
   * Run intelligent analysis on collected logs
   */
  analyze(timeWindowMs: number = 300000): AnalysisResult {
    const windowStart = new Date(Date.now() - timeWindowMs);
    const windowLogs = this.recentLogs.filter(
      (log) => new Date(log.timestamp) >= windowStart,
    );

    const patterns: Record<string, number> = {};
    const correlations: Set<string> = new Set();
    const anomalies: string[] = [];
    const recommendations: string[] = [];

    // Analyze counts and patterns
    windowLogs.forEach((log) => {
      patterns[log.level] = (patterns[log.level] || 0) + 1;
      if (log.correlationId) correlations.add(log.correlationId);

      // Simple anomaly detection: error bursts
      if (log.level === 'error') {
        anomalies.push(`Error: ${log.message} (CorrelationId: ${log.correlationId})`);
      }
    });

    // Heuristics for recommendations
    if (patterns['error'] > 10) {
      recommendations.push(
        'Error burst detected. Check upstream service health.',
      );
    }

    if (patterns['warn'] > 50) {
      recommendations.push(
        'High warning rate. Investigate potential configuration issues or impending failures.',
      );
    }

    const result: AnalysisResult = {
      anomalyDetected: anomalies.length > 0,
      patterns,
      correlations: Array.from(correlations),
      anomalies,
      recommendations,
    };

    if (result.anomalyDetected) {
      this.logger.warn(`[Log Analysis] Anomalies detected: ${anomalies.length}`);
    }

    return result;
  }

  /**
   * Search and filter logs across traces
   */
  searchTraces(traceId: string): LogRecord[] {
    return this.recentLogs.filter((log) => log.traceId === traceId);
  }

  /**
   * Aggregation for a specific correlation ID
   */
  aggregateByCorrelation(correlationId: string): LogRecord[] {
    return this.recentLogs.filter((log) => log.correlationId === correlationId);
  }

  /**
   * Performance impact analysis
   */
  analyzePerformanceImpact(operation: string): AnalysisResult {
    const operationLogs = this.recentLogs.filter(
        (log) => log.message.includes(operation) && log.metadata?.durationMs
    );
    
    // Analyze performance metrics across aggregated logs
    return this.analyze();
  }
}
