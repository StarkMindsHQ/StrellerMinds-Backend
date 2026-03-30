import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  ErrorReport, 
  ErrorSeverity, 
  ErrorCategory, 
  ErrorStatus,
  ErrorPattern 
} from '../models/ErrorReport';

export interface ClassificationResult {
  category: ErrorCategory;
  severity: ErrorSeverity;
  confidence: number;
  suggestedActions: string[];
  patterns: ErrorPattern[];
  metadata: Record<string, any>;
}

export interface ErrorContext {
  service?: string;
  endpoint?: string;
  method?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  customData?: Record<string, any>;
}

@Injectable()
export class ErrorClassifier {
  private readonly logger = new Logger(ErrorClassifier.name);
  private classificationCache = new Map<string, ClassificationResult>();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(
    @InjectRepository(ErrorPattern)
    private patternRepository: Repository<ErrorPattern>,
  ) {
    this.initializeDefaultPatterns();
  }

  async classifyError(
    message: string,
    stackTrace: string,
    context: ErrorContext = {},
  ): Promise<ClassificationResult> {
    const cacheKey = this.generateCacheKey(message, stackTrace, context);
    
    // Check cache first
    if (this.classificationCache.has(cacheKey)) {
      return this.classificationCache.get(cacheKey)!;
    }

    const result = await this.performClassification(message, stackTrace, context);
    
    // Cache the result
    this.classificationCache.set(cacheKey, result);

    return result;
  }

  private async performClassification(
    message: string,
    stackTrace: string,
    context: ErrorContext,
  ): Promise<ClassificationResult> {
    // Find matching patterns
    const patterns = await this.findMatchingPatterns(message, stackTrace);
    
    // Determine category
    const category = this.determineCategory(message, stackTrace, context, patterns);
    
    // Determine severity
    const severity = this.determineSeverity(message, stackTrace, context, category);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(message, stackTrace, patterns);
    
    // Suggest actions
    const suggestedActions = this.suggestRecoveryActions(category, severity, patterns);
    
    // Generate metadata
    const metadata = this.generateMetadata(message, stackTrace, context, patterns);

    return {
      category,
      severity,
      confidence,
      suggestedActions,
      patterns,
      metadata,
    };
  }

  private async findMatchingPatterns(message: string, stackTrace: string): Promise<ErrorPattern[]> {
    const patterns = await this.patternRepository.find({
      where: { isActive: true },
    });

    const matches: ErrorPattern[] = [];

    for (const pattern of patterns) {
      if (this.matchesPattern(message, stackTrace, pattern.pattern)) {
        matches.push(pattern);
        
        // Update match count
        pattern.matchCount += 1;
        pattern.examples.push({
          message,
          stackTrace,
          matchedAt: new Date(),
        });
        
        // Keep only last 10 examples
        if (pattern.examples.length > 10) {
          pattern.examples = pattern.examples.slice(-10);
        }
        
        await this.patternRepository.save(pattern);
      }
    }

    return matches;
  }

  private matchesPattern(message: string, stackTrace: string, pattern: string): boolean {
    try {
      // Support regex patterns
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        const regex = new RegExp(pattern.slice(1, -1), 'i');
        return regex.test(message) || regex.test(stackTrace);
      }
      
      // Support wildcard patterns
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
        return regex.test(message) || regex.test(stackTrace);
      }
      
      // Simple string matching
      return message.toLowerCase().includes(pattern.toLowerCase()) ||
             stackTrace.toLowerCase().includes(pattern.toLowerCase());
    } catch (error) {
      this.logger.warn(`Invalid pattern: ${pattern}`, error);
      return false;
    }
  }

  private determineCategory(
    message: string, 
    stackTrace: string, 
    context: ErrorContext,
    patterns: ErrorPattern[]
  ): ErrorCategory {
    // Check matched patterns first
    if (patterns.length > 0 && patterns[0].category) {
      return patterns[0].category;
    }

    const lowerMessage = message.toLowerCase();
    const lowerStackTrace = stackTrace.toLowerCase();

    // Database errors
    if (this.containsAny(lowerMessage, ['database', 'sql', 'connection', 'timeout', 'deadlock', 'constraint']) ||
        this.containsAny(lowerStackTrace, ['sql', 'database', 'connection', 'pool'])) {
      return ErrorCategory.DATABASE;
    }

    // Network errors
    if (this.containsAny(lowerMessage, ['network', 'connection refused', 'timeout', 'econnrefused', 'etimedout']) ||
        this.containsAny(lowerStackTrace, ['net', 'socket', 'connection'])) {
      return ErrorCategory.NETWORK;
    }

    // Authentication errors
    if (this.containsAny(lowerMessage, ['unauthorized', 'authentication', 'login', 'token', 'jwt', 'credential']) ||
        this.containsAny(lowerStackTrace, ['auth', 'jwt', 'passport'])) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Authorization errors
    if (this.containsAny(lowerMessage, ['forbidden', 'access denied', 'permission', 'unauthorized', 'role']) ||
        this.containsAny(lowerStackTrace, ['authorization', 'permission', 'role'])) {
      return ErrorCategory.AUTHORIZATION;
    }

    // Validation errors
    if (this.containsAny(lowerMessage, ['validation', 'invalid', 'required', 'format', 'schema']) ||
        this.containsAny(lowerStackTrace, ['validation', 'schema', 'validator'])) {
      return ErrorCategory.VALIDATION;
    }

    // External service errors
    if (this.containsAny(lowerMessage, ['external', 'api', 'third party', 'service unavailable']) ||
        this.containsAny(lowerStackTrace, ['axios', 'http', 'external'])) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }

    // Performance errors
    if (this.containsAny(lowerMessage, ['timeout', 'slow', 'performance', 'memory', 'cpu']) ||
        this.containsAny(lowerStackTrace, ['timeout', 'memory', 'performance'])) {
      return ErrorCategory.PERFORMANCE;
    }

    // Security errors
    if (this.containsAny(lowerMessage, ['security', 'csrf', 'xss', 'injection', 'breach']) ||
        this.containsAny(lowerStackTrace, ['security', 'csrf', 'xss'])) {
      return ErrorCategory.SECURITY;
    }

    // System errors
    if (this.containsAny(lowerMessage, ['system', 'os', 'file', 'disk', 'permission denied']) ||
        this.containsAny(lowerStackTrace, ['fs', 'system', 'os'])) {
      return ErrorCategory.SYSTEM;
    }

    // Business logic errors
    if (this.containsAny(lowerMessage, ['business', 'logic', 'rule', 'constraint', 'workflow']) ||
        this.containsAny(lowerStackTrace, ['business', 'logic', 'rule'])) {
      return ErrorCategory.BUSINESS_LOGIC;
    }

    // Default to system
    return ErrorCategory.SYSTEM;
  }

  private determineSeverity(
    message: string,
    stackTrace: string,
    context: ErrorContext,
    category: ErrorCategory,
  ): ErrorSeverity {
    const lowerMessage = message.toLowerCase();
    const lowerStackTrace = stackTrace.toLowerCase();

    // Critical severity indicators
    if (this.containsAny(lowerMessage, ['critical', 'fatal', 'panic', 'emergency']) ||
        this.containsAny(lowerStackTrace, ['fatal', 'panic', 'emergency'])) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity indicators
    if (this.containsAny(lowerMessage, ['exception', 'error', 'failed', 'crashed', 'down']) ||
        this.containsAny(lowerStackTrace, ['exception', 'error'])) {
      return ErrorSeverity.HIGH;
    }

    // Category-based severity
    switch (category) {
      case ErrorCategory.SECURITY:
      case ErrorCategory.DATABASE:
        return ErrorSeverity.HIGH;
      
      case ErrorCategory.SYSTEM:
      case ErrorCategory.EXTERNAL_SERVICE:
        return ErrorSeverity.MEDIUM;
      
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.VALIDATION:
        return ErrorSeverity.LOW;
      
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private calculateConfidence(
    message: string,
    stackTrace: string,
    patterns: ErrorPattern[],
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on pattern matches
    if (patterns.length > 0) {
      confidence += 0.3 * (patterns.length / Math.max(patterns.length, 1));
    }

    // Increase confidence for specific error types
    if (this.containsAny(message.toLowerCase(), ['error', 'exception', 'failed'])) {
      confidence += 0.1;
    }

    // Increase confidence for stack trace presence
    if (stackTrace && stackTrace.length > 100) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private suggestRecoveryActions(
    category: ErrorCategory,
    severity: ErrorSeverity,
    patterns: ErrorPattern[],
  ): string[] {
    const actions: string[] = [];

    // Get actions from patterns
    for (const pattern of patterns) {
      if (pattern.suggestedRecoveryActions) {
        actions.push(...pattern.suggestedRecoveryActions);
      }
    }

    // Add category-specific actions
    switch (category) {
      case ErrorCategory.DATABASE:
        actions.push('retry', 'circuit_breaker', 'cache_invalidation');
        break;
      
      case ErrorCategory.NETWORK:
        actions.push('retry', 'circuit_breaker', 'fallback');
        break;
      
      case ErrorCategory.EXTERNAL_SERVICE:
        actions.push('retry', 'circuit_breaker', 'fallback', 'escalate');
        break;
      
      case ErrorCategory.SYSTEM:
        actions.push('service_restart', 'escalate');
        break;
      
      case ErrorCategory.SECURITY:
        actions.push('escalate', 'manual_intervention');
        break;
      
      case ErrorCategory.PERFORMANCE:
        actions.push('cache_invalidation', 'escalate');
        break;
      
      default:
        actions.push('retry');
        break;
    }

    // Add severity-specific actions
    if (severity === ErrorSeverity.CRITICAL) {
      actions.push('escalate', 'manual_intervention');
    }

    // Remove duplicates and return
    return [...new Set(actions)];
  }

  private generateMetadata(
    message: string,
    stackTrace: string,
    context: ErrorContext,
    patterns: ErrorPattern[],
  ): Record<string, any> {
    return {
      messageLength: message.length,
      stackTraceLength: stackTrace.length,
      hasStackTrace: !!stackTrace,
      patternMatches: patterns.length,
      patternIds: patterns.map(p => p.id),
      contextKeys: Object.keys(context),
      classificationTimestamp: new Date().toISOString(),
      keywords: this.extractKeywords(message),
    };
  }

  private extractKeywords(message: string): string[] {
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isCommonWord(word));
    
    // Return unique keywords
    return [...new Set(words)].slice(0, 10);
  }

  private isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
      'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
      'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'error',
      'exception', 'message', 'stack', 'trace'
    ];
    
    return commonWords.includes(word);
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private generateCacheKey(message: string, stackTrace: string, context: ErrorContext): string {
    const keyData = {
      message: message.substring(0, 200), // First 200 chars
      stackTraceHash: this.simpleHash(stackTrace),
      service: context.service,
      endpoint: context.endpoint,
    };
    
    return this.simpleHash(JSON.stringify(keyData));
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private async initializeDefaultPatterns(): Promise<void> {
    const defaultPatterns = [
      {
        pattern: '/connection.*timeout/i',
        category: ErrorCategory.NETWORK,
        defaultSeverity: ErrorSeverity.MEDIUM,
        suggestedRecoveryActions: ['retry', 'circuit_breaker'],
      },
      {
        pattern: '/database.*connection/i',
        category: ErrorCategory.DATABASE,
        defaultSeverity: ErrorSeverity.HIGH,
        suggestedRecoveryActions: ['retry', 'circuit_breaker', 'cache_invalidation'],
      },
      {
        pattern: '/unauthorized/i',
        category: ErrorCategory.AUTHENTICATION,
        defaultSeverity: ErrorSeverity.LOW,
        suggestedRecoveryActions: ['retry'],
      },
      {
        pattern: '/forbidden/i',
        category: ErrorCategory.AUTHORIZATION,
        defaultSeverity: ErrorSeverity.LOW,
        suggestedRecoveryActions: ['retry'],
      },
      {
        pattern: '/validation.*failed/i',
        category: ErrorCategory.VALIDATION,
        defaultSeverity: ErrorSeverity.LOW,
        suggestedRecoveryActions: ['retry'],
      },
      {
        pattern: '/service.*unavailable/i',
        category: ErrorCategory.EXTERNAL_SERVICE,
        defaultSeverity: ErrorSeverity.HIGH,
        suggestedRecoveryActions: ['retry', 'circuit_breaker', 'fallback'],
      },
      {
        pattern: '/memory.*out/i',
        category: ErrorCategory.SYSTEM,
        defaultSeverity: ErrorSeverity.CRITICAL,
        suggestedRecoveryActions: ['service_restart', 'escalate'],
      },
      {
        pattern: '/disk.*full/i',
        category: ErrorCategory.SYSTEM,
        defaultSeverity: ErrorSeverity.CRITICAL,
        suggestedRecoveryActions: ['escalate', 'manual_intervention'],
      },
      {
        pattern: '/sql.*constraint/i',
        category: ErrorCategory.DATABASE,
        defaultSeverity: ErrorSeverity.MEDIUM,
        suggestedRecoveryActions: ['retry'],
      },
      {
        pattern: '/timeout.*expired/i',
        category: ErrorCategory.PERFORMANCE,
        defaultSeverity: ErrorSeverity.MEDIUM,
        suggestedRecoveryActions: ['retry', 'cache_invalidation'],
      },
    ];

    for (const patternData of defaultPatterns) {
      const existing = await this.patternRepository.findOne({
        where: { pattern: patternData.pattern },
      });

      if (!existing) {
        const pattern = this.patternRepository.create({
          ...patternData,
          isActive: true,
          matchCount: 0,
          examples: [],
          createdBy: { id: 'system' } as any,
          updatedBy: { id: 'system' } as any,
        });
        
        await this.patternRepository.save(pattern);
      }
    }

    this.logger.log(`Initialized ${defaultPatterns.length} default error patterns`);
  }

  async createPattern(
    pattern: string,
    category: ErrorCategory,
    defaultSeverity: ErrorSeverity,
    suggestedRecoveryActions: string[],
    userId: string,
  ): Promise<ErrorPattern> {
    const existing = await this.patternRepository.findOne({
      where: { pattern },
    });

    if (existing) {
      throw new Error(`Pattern already exists: ${pattern}`);
    }

    const newPattern = this.patternRepository.create({
      pattern,
      category,
      defaultSeverity,
      suggestedRecoveryActions: suggestedRecoveryActions as any,
      isActive: true,
      matchCount: 0,
      examples: [],
      createdBy: { id: userId } as any,
      updatedBy: { id: userId } as any,
    });

    return this.patternRepository.save(newPattern);
  }

  async updatePattern(
    patternId: string,
    updates: Partial<ErrorPattern>,
    userId: string,
  ): Promise<ErrorPattern> {
    const pattern = await this.patternRepository.findOne({
      where: { id: patternId },
    });

    if (!pattern) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    Object.assign(pattern, updates);
    pattern.updatedBy = { id: userId } as any;

    return this.patternRepository.save(pattern);
  }

  async deletePattern(patternId: string): Promise<void> {
    const pattern = await this.patternRepository.findOne({
      where: { id: patternId },
    });

    if (!pattern) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    await this.patternRepository.remove(pattern);
  }

  async getPatterns(category?: ErrorCategory): Promise<ErrorPattern[]> {
    const where: any = { isActive: true };
    if (category) {
      where.category = category;
    }

    return this.patternRepository.find({
      where,
      order: { matchCount: 'DESC' },
    });
  }

  async getPatternStatistics(): Promise<Record<string, any>> {
    const patterns = await this.patternRepository.find({
      where: { isActive: true },
    });

    const stats = {
      totalPatterns: patterns.length,
      patternsByCategory: {} as Record<string, number>,
      totalMatches: 0,
      topPatterns: patterns
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 10)
        .map(p => ({
          pattern: p.pattern,
          category: p.category,
          matchCount: p.matchCount,
        })),
    };

    for (const pattern of patterns) {
      stats.patternsByCategory[pattern.category] = 
        (stats.patternsByCategory[pattern.category] || 0) + 1;
      stats.totalMatches += pattern.matchCount;
    }

    return stats;
  }

  clearCache(): void {
    this.classificationCache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.classificationCache.size,
      keys: Array.from(this.classificationCache.keys()),
    };
  }
}
