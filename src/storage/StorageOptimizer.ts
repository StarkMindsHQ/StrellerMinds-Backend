import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum StorageTier {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold',
  ARCHIVE = 'archive'
}

export interface AccessPattern {
  key: string;
  accessCount: number;
  lastAccessed: Date;
  size: number;
  frequency: number;
}

export interface StorageMetrics {
  totalSize: number;
  accessFrequency: number;
  costPerGB: number;
  retrievalTime: number;
}

export interface OptimizationRule {
  condition: (pattern: AccessPattern) => boolean;
  targetTier: StorageTier;
  priority: number;
}

export interface OptimizationResult {
  key: string;
  currentTier: StorageTier;
  recommendedTier: StorageTier;
  savings: number;
  reason: string;
}

@Injectable()
export class StorageOptimizer {
  private readonly logger = new Logger(StorageOptimizer.name);
  private readonly accessPatterns: Map<string, AccessPattern> = new Map();
  private optimizationRules: OptimizationRule[] = [];

  constructor(private readonly configService: ConfigService) {
    this.initializeOptimizationRules();
  }

  private initializeOptimizationRules(): void {
    this.optimizationRules = [
      {
        condition: (pattern: AccessPattern) => 
          pattern.frequency > 100 && pattern.lastAccessed > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        targetTier: StorageTier.HOT,
        priority: 1,
      },
      {
        condition: (pattern: AccessPattern) => 
          pattern.frequency > 10 && pattern.frequency <= 100 && 
          pattern.lastAccessed > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        targetTier: StorageTier.WARM,
        priority: 2,
      },
      {
        condition: (pattern: AccessPattern) => 
          pattern.frequency > 1 && pattern.frequency <= 10 && 
          pattern.lastAccessed > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        targetTier: StorageTier.COLD,
        priority: 3,
      },
      {
        condition: (pattern: AccessPattern) => 
          pattern.frequency <= 1 || 
          pattern.lastAccessed <= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        targetTier: StorageTier.ARCHIVE,
        priority: 4,
      },
    ];
  }

  recordAccess(key: string, size: number): void {
    const now = new Date();
    const existing = this.accessPatterns.get(key);

    if (existing) {
      existing.accessCount++;
      existing.lastAccessed = now;
      existing.frequency = this.calculateFrequency(existing);
    } else {
      this.accessPatterns.set(key, {
        key,
        accessCount: 1,
        lastAccessed: now,
        size,
        frequency: 1,
      });
    }
  }

  private calculateFrequency(pattern: AccessPattern): number {
    const daysSinceCreation = Math.max(1, 
      (Date.now() - pattern.lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
    );
    return pattern.accessCount / daysSinceCreation;
  }

  async optimizeStorage(): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];
    const patterns = Array.from(this.accessPatterns.values());

    for (const pattern of patterns) {
      const recommendation = await this.analyzeAndRecommend(pattern);
      if (recommendation) {
        results.push(recommendation);
      }
    }

    return results.sort((a, b) => b.savings - a.savings);
  }

  private async analyzeAndRecommend(pattern: AccessPattern): Promise<OptimizationResult | null> {
    const currentTier = this.getCurrentTier(pattern);
    const recommendedTier = this.getRecommendedTier(pattern);

    if (currentTier === recommendedTier) {
      return null;
    }

    const savings = await this.calculateSavings(pattern, currentTier, recommendedTier);
    const reason = this.getOptimizationReason(pattern, currentTier, recommendedTier);

    return {
      key: pattern.key,
      currentTier,
      recommendedTier,
      savings,
      reason,
    };
  }

  private getCurrentTier(pattern: AccessPattern): StorageTier {
    for (const rule of this.optimizationRules.sort((a, b) => a.priority - b.priority)) {
      if (rule.condition(pattern)) {
        return rule.targetTier;
      }
    }
    return StorageTier.COLD;
  }

  private getRecommendedTier(pattern: AccessPattern): StorageTier {
    for (const rule of this.optimizationRules.sort((a, b) => a.priority - b.priority)) {
      if (rule.condition(pattern)) {
        return rule.targetTier;
      }
    }
    return StorageTier.COLD;
  }

  private async calculateSavings(
    pattern: AccessPattern,
    currentTier: StorageTier,
    recommendedTier: StorageTier
  ): Promise<number> {
    const currentCost = this.getStorageCost(currentTier, pattern.size);
    const recommendedCost = this.getStorageCost(recommendedTier, pattern.size);
    return currentCost - recommendedCost;
  }

  private getStorageCost(tier: StorageTier, sizeInBytes: number): number {
    const sizeInGB = sizeInBytes / (1024 * 1024 * 1024);
    const monthlyCostPerGB = this.getCostPerGB(tier);
    return sizeInGB * monthlyCostPerGB;
  }

  private getCostPerGB(tier: StorageTier): number {
    const costs = {
      [StorageTier.HOT]: this.configService.get<number>('STORAGE_COST_HOT_GB', 0.023),
      [StorageTier.WARM]: this.configService.get<number>('STORAGE_COST_WARM_GB', 0.0125),
      [StorageTier.COLD]: this.configService.get<number>('STORAGE_COST_COLD_GB', 0.004),
      [StorageTier.ARCHIVE]: this.configService.get<number>('STORAGE_COST_ARCHIVE_GB', 0.00099),
    };
    return costs[tier];
  }

  private getOptimizationReason(
    pattern: AccessPattern,
    currentTier: StorageTier,
    recommendedTier: StorageTier
  ): string {
    const reasons = {
      [StorageTier.HOT]: 'High frequency access (>100 times/month, accessed within last 7 days)',
      [StorageTier.WARM]: 'Medium frequency access (10-100 times/month, accessed within last 30 days)',
      [StorageTier.COLD]: 'Low frequency access (1-10 times/month, accessed within last 90 days)',
      [StorageTier.ARCHIVE]: 'Very low or no access (≤1 time/month or not accessed in 90+ days)',
    };

    return `Optimized from ${currentTier} to ${recommendedTier}: ${reasons[recommendedTier]}`;
  }

  async getStorageMetrics(): Promise<StorageMetrics> {
    const patterns = Array.from(this.accessPatterns.values());
    
    const totalSize = patterns.reduce((sum, pattern) => sum + pattern.size, 0);
    const totalAccesses = patterns.reduce((sum, pattern) => sum + pattern.accessCount, 0);
    const averageFrequency = patterns.length > 0 ? totalAccesses / patterns.length : 0;
    
    const costPerGB = this.getAverageCostPerGB(patterns);
    const estimatedRetrievalTime = this.getEstimatedRetrievalTime(patterns);

    return {
      totalSize,
      accessFrequency: averageFrequency,
      costPerGB,
      retrievalTime: estimatedRetrievalTime,
    };
  }

  private getAverageCostPerGB(patterns: AccessPattern[]): number {
    if (patterns.length === 0) return 0;

    const totalCost = patterns.reduce((sum, pattern) => {
      const tier = this.getCurrentTier(pattern);
      return sum + this.getStorageCost(tier, pattern.size);
    }, 0);

    const totalSize = patterns.reduce((sum, pattern) => sum + pattern.size, 0);
    const totalSizeGB = totalSize / (1024 * 1024 * 1024);

    return totalSizeGB > 0 ? totalCost / totalSizeGB : 0;
  }

  private getEstimatedRetrievalTime(patterns: AccessPattern[]): number {
    const tierRetrievalTimes = {
      [StorageTier.HOT]: 50,
      [StorageTier.WARM]: 200,
      [StorageTier.COLD]: 500,
      [StorageTier.ARCHIVE]: 12000,
    };

    if (patterns.length === 0) return 0;

    const totalTime = patterns.reduce((sum, pattern) => {
      const tier = this.getCurrentTier(pattern);
      return sum + tierRetrievalTimes[tier];
    }, 0);

    return totalTime / patterns.length;
  }

  async getTierDistribution(): Promise<Record<StorageTier, { count: number; size: number }>> {
    const distribution: Record<StorageTier, { count: number; size: number }> = {
      [StorageTier.HOT]: { count: 0, size: 0 },
      [StorageTier.WARM]: { count: 0, size: 0 },
      [StorageTier.COLD]: { count: 0, size: 0 },
      [StorageTier.ARCHIVE]: { count: 0, size: 0 },
    };

    for (const pattern of this.accessPatterns.values()) {
      const tier = this.getCurrentTier(pattern);
      distribution[tier].count++;
      distribution[tier].size += pattern.size;
    }

    return distribution;
  }

  async getOptimizationReport(): Promise<{
    totalObjects: number;
    totalSize: number;
    optimizedObjects: number;
    potentialSavings: number;
    tierDistribution: Record<StorageTier, { count: number; size: number }>;
    recommendations: OptimizationResult[];
  }> {
    const patterns = Array.from(this.accessPatterns.values());
    const totalObjects = patterns.length;
    const totalSize = patterns.reduce((sum, pattern) => sum + pattern.size, 0);
    
    const recommendations = await this.optimizeStorage();
    const optimizedObjects = recommendations.length;
    const potentialSavings = recommendations.reduce((sum, rec) => sum + rec.savings, 0);
    
    const tierDistribution = await this.getTierDistribution();

    return {
      totalObjects,
      totalSize,
      optimizedObjects,
      potentialSavings,
      tierDistribution,
      recommendations,
    };
  }

  async applyOptimizations(recommendations: OptimizationResult[]): Promise<void> {
    for (const recommendation of recommendations) {
      try {
        await this.moveToTier(recommendation.key, recommendation.recommendedTier);
        this.logger.log(`Moved ${recommendation.key} to ${recommendation.recommendedTier} tier`);
      } catch (error) {
        this.logger.error(`Failed to move ${recommendation.key} to ${recommendation.recommendedTier}:`, error);
      }
    }
  }

  private async moveToTier(key: string, tier: StorageTier): Promise<void> {
    const pattern = this.accessPatterns.get(key);
    if (!pattern) {
      throw new Error(`Pattern not found for key: ${key}`);
    }

    this.logger.log(`Moving ${key} to ${tier} tier (implementation would depend on cloud provider)`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  clearAccessPatterns(): void {
    this.accessPatterns.clear();
    this.logger.log('Access patterns cleared');
  }

  getAccessPattern(key: string): AccessPattern | undefined {
    return this.accessPatterns.get(key);
  }

  getAllAccessPatterns(): AccessPattern[] {
    return Array.from(this.accessPatterns.values());
  }

  async simulateOptimizationImpact(): Promise<{
    costSavings: number;
    performanceImpact: string;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const recommendations = await this.optimizeStorage();
    const totalSavings = recommendations.reduce((sum, rec) => sum + rec.savings, 0);
    
    const hotToWarmCount = recommendations.filter(r => 
      r.currentTier === StorageTier.HOT && r.recommendedTier === StorageTier.WARM
    ).length;
    
    const performanceImpact = hotToWarmCount > 0 
      ? `Minor performance impact for ${hotToWarmCount} objects moving from Hot to Warm`
      : 'No significant performance impact expected';
    
    const riskLevel = totalSavings > 100 ? 'low' : totalSavings > 10 ? 'medium' : 'high';

    return {
      costSavings: totalSavings,
      performanceImpact,
      riskLevel,
    };
  }
}
