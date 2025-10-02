export interface QueryExecutionPlan {
  nodeType: string;
  totalCost: number;
  startupCost: number;
  planRows: number;
  planWidth: number;
  actualRows?: number;
  actualLoops?: number;
  actualTotalTime?: number;
  children?: QueryExecutionPlan[];
}

export interface QueryAnalysisResult {
  query: string;
  executionTime: number;
  executionPlan: QueryExecutionPlan;
  suggestions: OptimizationSuggestion[];
  performanceScore: number;
  indexRecommendations: IndexRecommendation[];
}

export interface OptimizationSuggestion {
  type: 'INDEX' | 'QUERY_REWRITE' | 'SCHEMA_CHANGE' | 'CONFIGURATION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: string;
  implementation: string;
}

export interface IndexRecommendation {
  tableName: string;
  columns: string[];
  indexType: 'BTREE' | 'HASH' | 'GIN' | 'GIST';
  estimatedImprovement: number;
  reason: string;
}

export interface QueryPerformanceMetrics {
  queryId: string;
  query: string;
  avgExecutionTime: number;
  totalExecutions: number;
  slowestExecution: number;
  fastestExecution: number;
  lastExecuted: Date;
  cacheHitRatio?: number;
}
