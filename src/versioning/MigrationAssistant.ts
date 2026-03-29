import { Injectable, Logger } from '@nestjs/common';
import { MigrationStrategy } from '../models/APIVersion';

/**
 * Migration Assistant Service
 * Automates request/response transformations between different API versions
 */
@Injectable()
export class MigrationAssistant {
  private readonly logger = new Logger(MigrationAssistant.name);
  private strategies: Map<string, MigrationStrategy[]> = new Map();

  /**
   * Register a migration strategy between two versions
   */
  registerMigration(strategy: MigrationStrategy): void {
    const key = `${strategy.sourceVersion}->${strategy.targetVersion}`;
    const existing = this.strategies.get(key) || [];
    existing.push(strategy);
    this.strategies.set(key, existing);

    this.logger.debug(`[Migration Assistant] Registered migration strategy: ${key}`);
  }

  /**
   * Migrate data from a source version to a target version
   */
  async migrateData(sourceVersion: string, targetVersion: string, data: any): Promise<any> {
    const key = `${sourceVersion}->${targetVersion}`;
    const strategies = this.strategies.get(key);

    if (!strategies || strategies.length === 0) {
      this.logger.warn(`[Migration Assistant] No migration strategy found for ${key}`);
      return data;
    }

    let transformedData = { ...data };
    for (const strategy of strategies) {
      this.logger.debug(`[Migration Assistant] Applying transformation: ${key}`);
      transformedData = strategy.transform(transformedData);
    }

    return transformedData;
  }

  /**
   * Determine the optimal migration path if multiple steps are required
   */
  findMigrationPath(source: string, target: string): string[] | undefined {
    this.logger.log(`[Migration Assistant] Searching for path between ${source} and ${target}`);
    // Simplified: directly checking for direct or multi-step path logic
    return [source, target];
  }

  /**
   * Check for backward compatibility issues between versions
   */
  async checkBackwardCompatibility(source: string, target: string, sampleData: any): Promise<{ compatible: boolean, issues: string[] }> {
    const issues: string[] = [];
    
    // Minimalistic checks for demo purposes
    if (!this.strategies.has(`${source}->${target}`)) {
      issues.push(`No migration strategy defined for ${source} to ${target}`);
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }
}
