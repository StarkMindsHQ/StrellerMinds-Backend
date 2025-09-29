import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CompatibilityRule {
  fromVersion: string;
  toVersion: string;
  endpoint: string;
  method: string;
  transformation: (data: any) => any;
  reverseTransformation?: (data: any) => any;
}

export interface BreakingChange {
  version: string;
  endpoint: string;
  method: string;
  change: string;
  impact: 'low' | 'medium' | 'high';
  migrationGuide: string;
  alternative?: string;
}

@Injectable()
export class BackwardCompatibilityService {
  private readonly logger = new Logger(BackwardCompatibilityService.name);
  private compatibilityRules: CompatibilityRule[] = [];
  private breakingChanges: BreakingChange[] = [];

  constructor(private configService: ConfigService) {
    this.initializeCompatibilityRules();
    this.initializeBreakingChanges();
  }

  /**
   * Transform request data for backward compatibility
   */
  transformRequest(version: string, endpoint: string, method: string, data: any): any {
    const rule = this.findCompatibilityRule(version, endpoint, method);
    
    if (rule && rule.transformation) {
      this.logger.debug(`Applying backward compatibility transformation for ${version} ${method} ${endpoint}`);
      return rule.transformation(data);
    }
    
    return data;
  }

  /**
   * Transform response data for backward compatibility
   */
  transformResponse(version: string, endpoint: string, method: string, data: any): any {
    const rule = this.findCompatibilityRule(version, endpoint, method);
    
    if (rule && rule.reverseTransformation) {
      this.logger.debug(`Applying reverse transformation for ${version} ${method} ${endpoint}`);
      return rule.reverseTransformation(data);
    }
    
    return data;
  }

  /**
   * Check if an endpoint has breaking changes
   */
  hasBreakingChanges(version: string, endpoint: string, method: string): boolean {
    return this.breakingChanges.some(
      change => change.version === version && 
                change.endpoint === endpoint && 
                change.method === method
    );
  }

  /**
   * Get breaking changes for a version
   */
  getBreakingChanges(version: string): BreakingChange[] {
    return this.breakingChanges.filter(change => change.version === version);
  }

  /**
   * Get migration recommendations for a version
   */
  getMigrationRecommendations(fromVersion: string, toVersion: string): {
    breakingChanges: BreakingChange[];
    compatibilityRules: CompatibilityRule[];
    recommendations: string[];
  } {
    const relevantBreakingChanges = this.breakingChanges.filter(
      change => change.version === toVersion
    );

    const relevantRules = this.compatibilityRules.filter(
      rule => rule.fromVersion === fromVersion && rule.toVersion === toVersion
    );

    const recommendations = this.generateRecommendations(relevantBreakingChanges, relevantRules);

    return {
      breakingChanges: relevantBreakingChanges,
      compatibilityRules: relevantRules,
      recommendations,
    };
  }

  /**
   * Validate API contract compatibility
   */
  validateApiContract(oldContract: any, newContract: any): {
    compatible: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for removed endpoints
    const removedEndpoints = this.findRemovedEndpoints(oldContract, newContract);
    if (removedEndpoints.length > 0) {
      issues.push(`Removed endpoints: ${removedEndpoints.join(', ')}`);
      suggestions.push('Consider maintaining deprecated endpoints for backward compatibility');
    }

    // Check for changed request schemas
    const changedRequests = this.findChangedRequests(oldContract, newContract);
    if (changedRequests.length > 0) {
      issues.push(`Changed request schemas: ${changedRequests.join(', ')}`);
      suggestions.push('Add request transformation rules for backward compatibility');
    }

    // Check for changed response schemas
    const changedResponses = this.findChangedResponses(oldContract, newContract);
    if (changedResponses.length > 0) {
      issues.push(`Changed response schemas: ${changedResponses.join(', ')}`);
      suggestions.push('Add response transformation rules for backward compatibility');
    }

    return {
      compatible: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Generate compatibility report
   */
  generateCompatibilityReport(fromVersion: string, toVersion: string): any {
    const breakingChanges = this.getBreakingChanges(toVersion);
    const migrationRecommendations = this.getMigrationRecommendations(fromVersion, toVersion);
    const apiContractValidation = this.validateApiContract({}, {}); // Mock contracts

    return {
      fromVersion,
      toVersion,
      summary: {
        totalBreakingChanges: breakingChanges.length,
        highImpactChanges: breakingChanges.filter(c => c.impact === 'high').length,
        mediumImpactChanges: breakingChanges.filter(c => c.impact === 'medium').length,
        lowImpactChanges: breakingChanges.filter(c => c.impact === 'low').length,
        compatibilityScore: this.calculateCompatibilityScore(breakingChanges),
      },
      breakingChanges,
      migrationRecommendations,
      apiContractValidation,
      recommendations: this.generateCompatibilityRecommendations(breakingChanges),
    };
  }

  private findCompatibilityRule(version: string, endpoint: string, method: string): CompatibilityRule | undefined {
    return this.compatibilityRules.find(
      rule => rule.fromVersion === version && 
              rule.endpoint === endpoint && 
              rule.method === method
    );
  }

  private initializeCompatibilityRules(): void {
    // Example compatibility rules for v1 to v2 migration
    this.compatibilityRules = [
      {
        fromVersion: 'v1',
        toVersion: 'v2',
        endpoint: '/auth/login',
        method: 'POST',
        transformation: (data: any) => {
          // Transform v1 login request to v2 format
          if (data.username) {
            return {
              ...data,
              email: data.username,
              username: undefined,
            };
          }
          return data;
        },
        reverseTransformation: (data: any) => {
          // Transform v2 login response to v1 format
          return {
            ...data,
            user: data.user ? {
              ...data.user,
              username: data.user.email,
            } : undefined,
          };
        },
      },
      {
        fromVersion: 'v1',
        toVersion: 'v2',
        endpoint: '/courses',
        method: 'GET',
        transformation: (data: any) => {
          // Transform v1 course query to v2 format
          if (data.category) {
            return {
              ...data,
              categories: [data.category],
              category: undefined,
            };
          }
          return data;
        },
        reverseTransformation: (data: any) => {
          // Transform v2 course response to v1 format
          return {
            ...data,
            courses: data.courses?.map((course: any) => ({
              ...course,
              category: course.categories?.[0] || course.category,
            })),
          };
        },
      },
    ];
  }

  private initializeBreakingChanges(): void {
    this.breakingChanges = [
      {
        version: 'v2',
        endpoint: '/auth/login',
        method: 'POST',
        change: 'Username field renamed to email',
        impact: 'medium',
        migrationGuide: 'https://docs.strellerminds.com/api/migration/v1-to-v2#authentication',
        alternative: 'Use email field instead of username',
      },
      {
        version: 'v2',
        endpoint: '/courses',
        method: 'GET',
        change: 'Category parameter changed to categories array',
        impact: 'low',
        migrationGuide: 'https://docs.strellerminds.com/api/migration/v1-to-v2#courses',
        alternative: 'Use categories array instead of single category',
      },
      {
        version: 'v2',
        endpoint: '/users/profile',
        method: 'PUT',
        change: 'Profile update endpoint requires additional fields',
        impact: 'high',
        migrationGuide: 'https://docs.strellerminds.com/api/migration/v1-to-v2#users',
        alternative: 'Include all required fields in profile update',
      },
    ];
  }

  private generateRecommendations(breakingChanges: BreakingChange[], compatibilityRules: CompatibilityRule[]): string[] {
    const recommendations: string[] = [];

    if (breakingChanges.length > 0) {
      recommendations.push('Review breaking changes and update client code accordingly');
      recommendations.push('Test all affected endpoints thoroughly');
    }

    if (compatibilityRules.length > 0) {
      recommendations.push('Backward compatibility rules are available for smooth transition');
    }

    if (breakingChanges.filter(c => c.impact === 'high').length > 0) {
      recommendations.push('High-impact changes detected - plan migration carefully');
    }

    return recommendations;
  }

  private findRemovedEndpoints(oldContract: any, newContract: any): string[] {
    // Mock implementation - would compare actual API contracts
    return [];
  }

  private findChangedRequests(oldContract: any, newContract: any): string[] {
    // Mock implementation - would compare actual request schemas
    return [];
  }

  private findChangedResponses(oldContract: any, newContract: any): string[] {
    // Mock implementation - would compare actual response schemas
    return [];
  }

  private calculateCompatibilityScore(breakingChanges: BreakingChange[]): number {
    const totalChanges = breakingChanges.length;
    if (totalChanges === 0) return 100;

    const highImpactWeight = 3;
    const mediumImpactWeight = 2;
    const lowImpactWeight = 1;

    const weightedScore = breakingChanges.reduce((score, change) => {
      switch (change.impact) {
        case 'high':
          return score + highImpactWeight;
        case 'medium':
          return score + mediumImpactWeight;
        case 'low':
          return score + lowImpactWeight;
        default:
          return score + 1;
      }
    }, 0);

    const maxPossibleScore = totalChanges * highImpactWeight;
    return Math.max(0, 100 - (weightedScore / maxPossibleScore) * 100);
  }

  private generateCompatibilityRecommendations(breakingChanges: BreakingChange[]): string[] {
    const recommendations: string[] = [];

    const highImpactChanges = breakingChanges.filter(c => c.impact === 'high');
    const mediumImpactChanges = breakingChanges.filter(c => c.impact === 'medium');

    if (highImpactChanges.length > 0) {
      recommendations.push('Schedule downtime for high-impact changes');
      recommendations.push('Create comprehensive migration plan');
    }

    if (mediumImpactChanges.length > 0) {
      recommendations.push('Test affected endpoints thoroughly');
      recommendations.push('Update client libraries and SDKs');
    }

    if (breakingChanges.length > 0) {
      recommendations.push('Communicate changes to API consumers');
      recommendations.push('Provide migration guides and examples');
    }

    return recommendations;
  }
} 