import { Injectable, Logger } from '@nestjs/common';
import { DocumentNode, GraphQLResolveInfo, OperationTypeNode } from 'graphql';

export interface QueryComplexityAnalysis {
  complexity: number;
  depth: number;
  fieldCount: number;
  estimatedTime: number;
  warnings: string[];
  suggestions: string[];
  complexityBreakdown: FieldComplexity[];
}

export interface FieldComplexity {
  field: string;
  complexity: number;
  depth: number;
  type: string;
  isList: boolean;
  isNullable: boolean;
}

export interface ComplexityRule {
  name: string;
  description: string;
  maxComplexity: number;
  maxDepth: number;
  maxFields: number;
  enabled: boolean;
}

export interface QueryOptimizationSuggestion {
  type: 'COMPLEXITY' | 'DEPTH' | 'FIELDS' | 'PERFORMANCE' | 'CACHING';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  suggestion: string;
  impact: string;
}

@Injectable()
export class QueryOptimizer {
  private readonly logger = new Logger(QueryOptimizer.name);
  private readonly complexityRules = new Map<string, ComplexityRule>();
  private readonly fieldComplexityMap = new Map<string, number>();

  constructor() {
    this.initializeComplexityRules();
    this.initializeFieldComplexities();
  }

  private initializeComplexityRules(): void {
    // Default complexity rules
    this.complexityRules.set('default', {
      name: 'Default',
      description: 'Default complexity limits for all queries',
      maxComplexity: 100,
      maxDepth: 10,
      maxFields: 50,
      enabled: true,
    });

    this.complexityRules.set('admin', {
      name: 'Admin',
      description: 'Higher limits for admin users',
      maxComplexity: 500,
      maxDepth: 20,
      maxFields: 200,
      enabled: true,
    });

    this.complexityRules.set('api', {
      name: 'API',
      description: 'Strict limits for API clients',
      maxComplexity: 50,
      maxDepth: 5,
      maxFields: 25,
      enabled: true,
    });
  }

  private initializeFieldComplexities(): void {
    // Base field complexities
    this.fieldComplexityMap.set('id', 1);
    this.fieldComplexityMap.set('name', 1);
    this.fieldComplexityMap.set('title', 1);
    this.fieldComplexityMap.set('description', 1);
    this.fieldComplexityMap.set('email', 1);
    this.fieldComplexityMap.set('createdAt', 1);
    this.fieldComplexityMap.set('updatedAt', 1);

    // Higher complexity fields
    this.fieldComplexityMap.set('content', 2);
    this.fieldComplexityMap.set('htmlContent', 2);
    this.fieldComplexityMap.set('metadata', 2);
    this.fieldComplexityMap.set('data', 2);

    // List fields (higher complexity)
    this.fieldComplexityMap.set('users', 10);
    this.fieldComplexityMap.set('courses', 15);
    this.fieldComplexityMap.set('assignments', 12);
    this.fieldComplexityMap.set('submissions', 8);
    this.fieldComplexityMap.set('grades', 5);
    this.fieldComplexityMap.set('notifications', 3);
    this.fieldComplexityMap.set('auditLogs', 20);

    // Relational fields
    this.fieldComplexityMap.set('user', 3);
    this.fieldComplexityMap.set('course', 5);
    this.fieldComplexityMap.set('assignment', 4);
    this.fieldComplexityMap.set('submission', 3);
    this.fieldComplexityMap.set('grade', 2);

    // Computed fields
    this.fieldComplexityMap.set('statistics', 15);
    this.fieldComplexityMap.set('analytics', 20);
    this.fieldComplexityMap.set('reports', 25);
    this.fieldComplexityMap.set('search', 10);
  }

  analyzeQueryComplexity(
    query: DocumentNode,
    variables?: any,
    context?: any,
  ): QueryComplexityAnalysis {
    const operation = query.definitions.find(def => def.kind === 'OperationDefinition') as any;
    
    if (!operation) {
      throw new Error('No operation definition found in query');
    }

    const analysis: QueryComplexityAnalysis = {
      complexity: 0,
      depth: 0,
      fieldCount: 0,
      estimatedTime: 0,
      warnings: [],
      suggestions: [],
      complexityBreakdown: [],
    };

    // Analyze the query
    const fieldAnalysis = this.analyzeFields(operation.selectionSet, 0, variables);
    
    analysis.complexity = fieldAnalysis.complexity;
    analysis.depth = fieldAnalysis.depth;
    analysis.fieldCount = fieldAnalysis.fieldCount;
    analysis.complexityBreakdown = fieldAnalysis.breakdown;

    // Estimate execution time (rough calculation)
    analysis.estimatedTime = this.estimateExecutionTime(analysis.complexity);

    // Generate warnings and suggestions
    const ruleName = this.getRuleName(context);
    const rule = this.complexityRules.get(ruleName) || this.complexityRules.get('default')!;

    analysis.warnings = this.generateWarnings(analysis, rule);
    analysis.suggestions = this.generateOptimizationSuggestions(analysis, rule);

    this.logger.debug(`Query complexity analysis completed: ${analysis.complexity} complexity, ${analysis.depth} depth`);

    return analysis;
  }

  private analyzeFields(
    selectionSet: any,
    currentDepth: number,
    variables?: any,
  ): {
    complexity: number;
    depth: number;
    fieldCount: number;
    breakdown: FieldComplexity[];
  } {
    let complexity = 0;
    let fieldCount = 0;
    let maxDepth = currentDepth;
    const breakdown: FieldComplexity[] = [];

    if (!selectionSet || !selectionSet.selections) {
      return { complexity, depth: currentDepth, fieldCount, breakdown };
    }

    for (const selection of selectionSet.selections) {
      if (selection.kind === 'Field') {
        fieldCount++;
        const fieldName = selection.name.value;
        const fieldComplexity = this.getFieldComplexity(fieldName, selection, variables);
        
        complexity += fieldComplexity;

        // Add to breakdown
        breakdown.push({
          field: fieldName,
          complexity: fieldComplexity,
          depth: currentDepth,
          type: this.getFieldType(selection),
          isList: this.isListField(selection),
          isNullable: this.isNullableField(selection),
        });

        // Analyze nested fields
        if (selection.selectionSet) {
          const nestedAnalysis = this.analyzeFields(selection.selectionSet, currentDepth + 1, variables);
          complexity += nestedAnalysis.complexity;
          fieldCount += nestedAnalysis.fieldCount;
          maxDepth = Math.max(maxDepth, nestedAnalysis.depth);
          breakdown.push(...nestedAnalysis.breakdown);
        }
      } else if (selection.kind === 'FragmentSpread') {
        // Handle fragment spreads (simplified)
        fieldCount++;
        complexity += 5; // Base complexity for fragment
      } else if (selection.kind === 'InlineFragment') {
        // Handle inline fragments
        if (selection.selectionSet) {
          const fragmentAnalysis = this.analyzeFields(selection.selectionSet, currentDepth + 1, variables);
          complexity += fragmentAnalysis.complexity;
          fieldCount += fragmentAnalysis.fieldCount;
          maxDepth = Math.max(maxDepth, fragmentAnalysis.depth);
          breakdown.push(...fragmentAnalysis.breakdown);
        }
      }
    }

    return { complexity, depth: maxDepth, fieldCount, breakdown };
  }

  private getFieldComplexity(fieldName: string, field: any, variables?: any): number {
    // Base complexity from map
    let complexity = this.fieldComplexityMap.get(fieldName) || 1;

    // Apply arguments
    if (field.arguments) {
      for (const arg of field.arguments) {
        const argName = arg.name.value;
        const argValue = this.getArgumentValue(arg.value, variables);
        
        // Adjust complexity based on arguments
        if (argName === 'limit' || argName === 'first') {
          const limit = parseInt(argValue) || 10;
          complexity *= Math.min(limit / 10, 5); // Scale by limit, max 5x
        } else if (argName === 'where' || argName === 'filter') {
          complexity *= 1.5; // Filters add complexity
        } else if (argName === 'search' || argName === 'query') {
          complexity *= 2; // Search operations are expensive
        }
      }
    }

    // Apply list multiplier
    if (this.isListField(field)) {
      complexity *= 3; // Lists are more expensive
    }

    return Math.round(complexity);
  }

  private getArgumentValue(value: any, variables?: any): any {
    if (value.kind === 'Variable') {
      return variables?.[value.name.value];
    } else if (value.kind === 'IntValue') {
      return parseInt(value.value);
    } else if (value.kind === 'StringValue') {
      return value.value;
    } else if (value.kind === 'BooleanValue') {
      return value.value;
    }
    
    return value.value;
  }

  private isListField(field: any): boolean {
    // This would typically come from the GraphQL schema
    // For now, we'll use naming conventions
    const fieldName = field.name.value;
    return fieldName.endsWith('s') && !fieldName.endsWith('ss'); // Simple plural detection
  }

  private isNullableField(field: any): boolean {
    // This would typically come from the GraphQL schema
    // For now, we'll assume most fields are nullable
    return true;
  }

  private getFieldType(field: any): string {
    // This would typically come from the GraphQL schema
    // For now, we'll return a generic type
    return 'Unknown';
  }

  private estimateExecutionTime(complexity: number): number {
    // Rough estimation: 1ms per complexity point
    return complexity * 1;
  }

  private generateWarnings(analysis: QueryComplexityAnalysis, rule: ComplexityRule): string[] {
    const warnings: string[] = [];

    if (analysis.complexity > rule.maxComplexity) {
      warnings.push(`Query complexity (${analysis.complexity}) exceeds maximum allowed (${rule.maxComplexity})`);
    }

    if (analysis.depth > rule.maxDepth) {
      warnings.push(`Query depth (${analysis.depth}) exceeds maximum allowed (${rule.maxDepth})`);
    }

    if (analysis.fieldCount > rule.maxFields) {
      warnings.push(`Field count (${analysis.fieldCount}) exceeds maximum allowed (${rule.maxFields})`);
    }

    if (analysis.estimatedTime > 1000) {
      warnings.push(`Estimated execution time (${analysis.estimatedTime}ms) may impact performance`);
    }

    // Check for expensive field combinations
    const expensiveFields = analysis.complexityBreakdown.filter(f => f.complexity > 10);
    if (expensiveFields.length > 3) {
      warnings.push(`Multiple expensive fields detected: ${expensiveFields.map(f => f.field).join(', ')}`);
    }

    return warnings;
  }

  private generateOptimizationSuggestions(
    analysis: QueryComplexityAnalysis,
    rule: ComplexityRule,
  ): string[] {
    const suggestions: string[] = [];

    if (analysis.complexity > rule.maxComplexity * 0.8) {
      suggestions.push('Consider reducing query complexity by selecting only necessary fields');
    }

    if (analysis.depth > rule.maxDepth * 0.8) {
      suggestions.push('Consider reducing query depth by flattening nested queries');
    }

    if (analysis.fieldCount > rule.maxFields * 0.8) {
      suggestions.push('Consider reducing the number of fields or using fragments for reusable selections');
    }

    // Specific suggestions based on field analysis
    const listFields = analysis.complexityBreakdown.filter(f => f.isList);
    if (listFields.length > 2) {
      suggestions.push('Consider using pagination for list fields to reduce complexity');
    }

    const expensiveFields = analysis.complexityBreakdown.filter(f => f.complexity > 15);
    if (expensiveFields.length > 0) {
      suggestions.push(`Consider caching expensive fields: ${expensiveFields.map(f => f.field).join(', ')}`);
    }

    // Performance suggestions
    if (analysis.estimatedTime > 500) {
      suggestions.push('Consider enabling query caching for better performance');
    }

    return suggestions;
  }

  private getRuleName(context?: any): string {
    // Determine which complexity rule to apply based on context
    if (context?.user?.role === 'admin') {
      return 'admin';
    } else if (context?.isApiCall) {
      return 'api';
    }
    
    return 'default';
  }

  async optimizeQuery(
    query: DocumentNode,
    analysis: QueryComplexityAnalysis,
  ): Promise<{
    optimizedQuery: DocumentNode;
    optimizations: string[];
    savings: {
      complexityReduction: number;
      timeReduction: number;
    };
  }> {
    const optimizations: string[] = [];
    let optimizedQuery = query;

    // Apply optimizations based on analysis
    if (analysis.complexity > 100) {
      // Remove expensive fields
      optimizedQuery = this.removeExpensiveFields(optimizedQuery, analysis);
      optimizations.push('Removed expensive fields to reduce complexity');
    }

    if (analysis.depth > 8) {
      // Flatten nested queries
      optimizedQuery = this.flattenNestedQueries(optimizedQuery);
      optimizations.push('Flattened nested queries to reduce depth');
    }

    // Calculate savings
    const optimizedAnalysis = this.analyzeQueryComplexity(optimizedQuery);
    const savings = {
      complexityReduction: analysis.complexity - optimizedAnalysis.complexity,
      timeReduction: analysis.estimatedTime - optimizedAnalysis.estimatedTime,
    };

    this.logger.debug(`Query optimization completed: ${savings.complexityReduction} complexity reduction`);

    return {
      optimizedQuery,
      optimizations,
      savings,
    };
  }

  private removeExpensiveFields(query: DocumentNode, analysis: QueryComplexityAnalysis): DocumentNode {
    // This is a simplified implementation
    // In a real scenario, you would parse and modify the AST
    return query;
  }

  private flattenNestedQueries(query: DocumentNode): DocumentNode {
    // This is a simplified implementation
    // In a real scenario, you would parse and modify the AST
    return query;
  }

  addComplexityRule(rule: ComplexityRule): void {
    this.complexityRules.set(rule.name, rule);
    this.logger.debug(`Complexity rule added: ${rule.name}`);
  }

  updateComplexityRule(name: string, updates: Partial<ComplexityRule>): void {
    const existingRule = this.complexityRules.get(name);
    if (existingRule) {
      const updatedRule = { ...existingRule, ...updates };
      this.complexityRules.set(name, updatedRule);
      this.logger.debug(`Complexity rule updated: ${name}`);
    }
  }

  getComplexityRules(): ComplexityRule[] {
    return Array.from(this.complexityRules.values());
  }

  setFieldComplexity(fieldName: string, complexity: number): void {
    this.fieldComplexityMap.set(fieldName, complexity);
    this.logger.debug(`Field complexity updated: ${fieldName} = ${complexity}`);
  }

  getFieldComplexityMap(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const [field, complexity] of this.fieldComplexityMap.entries()) {
      map[field] = complexity;
    }
    return map;
  }

  async generateOptimizationReport(timeRange: { start: Date; end: Date }): Promise<any> {
    // This would typically analyze historical query data
    // For now, we'll return a mock report
    
    return {
      timeRange,
      totalQueries: 1000,
      averageComplexity: 45,
      averageDepth: 4,
      averageFields: 12,
      complexQueries: 50,
      optimizations: {
        queriesOptimized: 100,
        averageComplexityReduction: 25,
        averageTimeReduction: 150,
      },
      recommendations: [
        'Enable query caching for frequently used queries',
        'Add pagination to list fields',
        'Consider implementing field-level permissions',
      ],
      generatedAt: new Date(),
    };
  }

  async validateQuery(query: DocumentNode, context?: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    analysis: QueryComplexityAnalysis;
  }> {
    try {
      const analysis = this.analyzeQueryComplexity(query, undefined, context);
      const ruleName = this.getRuleName(context);
      const rule = this.complexityRules.get(ruleName) || this.complexityRules.get('default')!;

      const errors: string[] = [];
      const warnings: string[] = [];

      // Check against rules
      if (analysis.complexity > rule.maxComplexity) {
        errors.push(`Query complexity exceeds maximum allowed`);
      }

      if (analysis.depth > rule.maxDepth) {
        errors.push(`Query depth exceeds maximum allowed`);
      }

      if (analysis.fieldCount > rule.maxFields) {
        errors.push(`Field count exceeds maximum allowed`);
      }

      // Add warnings from analysis
      warnings.push(...analysis.warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        analysis,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        analysis: {
          complexity: 0,
          depth: 0,
          fieldCount: 0,
          estimatedTime: 0,
          warnings: [],
          suggestions: [],
          complexityBreakdown: [],
        },
      };
    }
  }
}
