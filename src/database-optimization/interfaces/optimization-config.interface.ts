export interface DatabaseOptimizationConfig {
  enableQueryLogging: boolean;
  slowQueryThreshold: number; // milliseconds
  maxQueryHistorySize: number;
  enableAutomaticIndexSuggestions: boolean;
  performanceAnalysisInterval: number; // minutes
  excludePatterns: string[];
  includeExplainAnalyze: boolean;
}

export const DEFAULT_OPTIMIZATION_CONFIG: DatabaseOptimizationConfig = {
  enableQueryLogging: true,
  slowQueryThreshold: 100, // Changed from 1000 to 100ms
  maxQueryHistorySize: 1000,
  enableAutomaticIndexSuggestions: true,
  performanceAnalysisInterval: 60,
  excludePatterns: ['SHOW', 'SET', 'BEGIN', 'COMMIT', 'ROLLBACK'],
  includeExplainAnalyze: false,
};
