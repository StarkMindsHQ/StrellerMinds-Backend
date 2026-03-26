import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestDatabaseService } from './test-database.service';
import { TestDataFactory } from '../factories/test-data.factory';

export interface TestDataSet {
  name: string;
  description: string;
  entities: any[];
  metadata: {
    version: string;
    createdAt: Date;
    size: 'minimal' | 'standard' | 'full';
  };
}

@Injectable()
export class TestDataManager {
  private readonly logger = new Logger(TestDataManager.name);
  private testDataCache = new Map<string, TestDataSet>();

  constructor(
    private readonly testDatabaseService: TestDatabaseService,
    private readonly testDataFactory: TestDataFactory,
  ) {}

  /**
   * Create and cache a test data set
   */
  async createDataSet(
    name: string,
    options: {
      description?: string;
      size?: 'minimal' | 'standard' | 'full';
      userCount?: number;
      courseCount?: number;
      assignmentCount?: number;
      paymentCount?: number;
      forumCount?: number;
    } = {},
  ): Promise<TestDataSet> {
    this.logger.log(`Creating test data set: ${name}`);

    const {
      description = `Test data set ${name}`,
      size = 'standard',
      userCount = size === 'minimal' ? 5 : size === 'standard' ? 20 : 50,
      courseCount = size === 'minimal' ? 2 : size === 'standard' ? 8 : 20,
      assignmentCount = size === 'minimal' ? 5 : size === 'standard' ? 25 : 60,
      paymentCount = size === 'minimal' ? 3 : size === 'standard' ? 15 : 40,
      forumCount = size === 'minimal' ? 1 : size === 'standard' ? 4 : 10,
    } = options;

    const entities = await this.testDataFactory.createTestScenario({
      userCount,
      courseCount,
      assignmentCount,
      paymentCount,
      forumCount,
    });

    const dataSet: TestDataSet = {
      name,
      description,
      entities: [
        ...entities.users,
        ...entities.courses,
        ...entities.assignments,
        ...entities.payments,
        ...entities.forums,
      ],
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        size,
      },
    };

    this.testDataCache.set(name, dataSet);
    this.logger.log(`Test data set ${name} created and cached`);

    return dataSet;
  }

  /**
   * Get a cached test data set
   */
  getDataSet(name: string): TestDataSet | undefined {
    return this.testDataCache.get(name);
  }

  /**
   * Get all cached test data sets
   */
  getAllDataSets(): TestDataSet[] {
    return Array.from(this.testDataCache.values());
  }

  /**
   * Remove a test data set from cache
   */
  removeDataSet(name: string): boolean {
    const removed = this.testDataCache.delete(name);
    if (removed) {
      this.logger.log(`Test data set ${name} removed from cache`);
    }
    return removed;
  }

  /**
   * Clear all cached test data sets
   */
  clearAllDataSets(): void {
    const count = this.testDataCache.size;
    this.testDataCache.clear();
    this.logger.log(`Cleared ${count} test data sets from cache`);
  }

  /**
   * Export test data set to JSON
   */
  exportDataSet(name: string): string | null {
    const dataSet = this.testDataCache.get(name);
    if (!dataSet) {
      return null;
    }

    return JSON.stringify(dataSet, null, 2);
  }

  /**
   * Import test data set from JSON
   */
  async importDataSet(jsonData: string): Promise<TestDataSet> {
    try {
      const dataSet: TestDataSet = JSON.parse(jsonData);
      
      // Validate the data set structure
      if (!dataSet.name || !dataSet.entities || !dataSet.metadata) {
        throw new Error('Invalid test data set format');
      }

      this.testDataCache.set(dataSet.name, dataSet);
      this.logger.log(`Test data set ${dataSet.name} imported successfully`);

      return dataSet;
    } catch (error) {
      this.logger.error('Failed to import test data set:', error);
      throw error;
    }
  }

  /**
   * Clone an existing test data set
   */
  async cloneDataSet(originalName: string, newName: string): Promise<TestDataSet> {
    const originalDataSet = this.testDataCache.get(originalName);
    if (!originalDataSet) {
      throw new Error(`Test data set ${originalName} not found`);
    }

    const clonedDataSet: TestDataSet = {
      ...originalDataSet,
      name: newName,
      description: `Cloned from ${originalName}`,
      metadata: {
        ...originalDataSet.metadata,
        version: '1.0.0',
        createdAt: new Date(),
      },
    };

    this.testDataCache.set(newName, clonedDataSet);
    this.logger.log(`Test data set ${originalName} cloned as ${newName}`);

    return clonedDataSet;
  }

  /**
   * Get statistics about test data sets
   */
  getStatistics(): {
    totalDataSets: number;
    totalEntities: number;
    dataSetsBySize: Record<string, number>;
    oldestDataSet?: Date;
    newestDataSet?: Date;
  } {
    const dataSets = this.getAllDataSets();
    const totalEntities = dataSets.reduce((sum, ds) => sum + ds.entities.length, 0);
    
    const dataSetsBySize = dataSets.reduce((acc, ds) => {
      acc[ds.metadata.size] = (acc[ds.metadata.size] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dates = dataSets.map(ds => ds.metadata.createdAt);
    const oldestDataSet = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : undefined;
    const newestDataSet = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : undefined;

    return {
      totalDataSets: dataSets.length,
      totalEntities,
      dataSetsBySize,
      oldestDataSet,
      newestDataSet,
    };
  }
}
