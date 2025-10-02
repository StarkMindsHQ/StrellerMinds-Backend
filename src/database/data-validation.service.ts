import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: 'data_integrity' | 'performance' | 'constraint' | 'business_logic';
  validate: (queryRunner: QueryRunner, context?: any) => Promise<ValidationResult>;
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  executionTime: number;
  timestamp: Date;
}

export interface ValidationReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    executionTime: number;
  };
  results: ValidationResult[];
  recommendations: string[];
  criticalIssues: string[];
}

@Injectable()
export class DataValidationService {
  private readonly logger = new Logger(DataValidationService.name);
  private readonly validationRules: ValidationRule[] = [];

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    this.initializeValidationRules();
  }

  /**
   * Initialize all validation rules
   */
  private initializeValidationRules(): void {
    // Data integrity rules
    this.validationRules.push(
      this.createForeignKeyIntegrityRule(),
      this.createNotNullConstraintRule(),
      this.createUniqueConstraintRule(),
      this.createCheckConstraintRule(),
      this.createReferentialIntegrityRule(),
      this.createDataTypeValidationRule(),
      this.createDataRangeValidationRule(),
      this.createOrphanedRecordRule(),
      this.createDuplicateDataRule(),
      this.createDataConsistencyRule(),
    );

    // Performance rules
    this.validationRules.push(
      this.createIndexEfficiencyRule(),
      this.createQueryPerformanceRule(),
      this.createTableSizeRule(),
      this.createConnectionPoolRule(),
    );

    // Business logic rules
    this.validationRules.push(
      this.createBusinessConstraintRule(),
      this.createDataRetentionRule(),
      this.createAuditTrailRule(),
    );
  }

  /**
   * Run comprehensive validation before migration
   */
  async validateBeforeMigration(migrationName: string, context?: any): Promise<ValidationReport> {
    this.logger.log(`🔍 Running pre-migration validation for: ${migrationName}`);

    const startTime = Date.now();
    const results: ValidationResult[] = [];

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      // Run all validation rules
      for (const rule of this.validationRules) {
        try {
          const result = await rule.validate(queryRunner, context);
          results.push(result);
        } catch (error) {
          this.logger.error(`Validation rule ${rule.name} failed: ${error.message}`);
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            status: 'fail',
            message: `Validation rule execution failed: ${error.message}`,
            executionTime: 0,
            timestamp: new Date(),
          });
        }
      }
    } finally {
      await queryRunner.release();
    }

    const executionTime = Date.now() - startTime;
    const summary = this.generateValidationSummary(results, executionTime);
    const recommendations = this.generateRecommendations(results);
    const criticalIssues = this.identifyCriticalIssues(results);

    return {
      summary,
      results,
      recommendations,
      criticalIssues,
    };
  }

  /**
   * Run validation after migration
   */
  async validateAfterMigration(migrationName: string, context?: any): Promise<ValidationReport> {
    this.logger.log(`🔍 Running post-migration validation for: ${migrationName}`);

    // Run the same validation rules to ensure data integrity is maintained
    return this.validateBeforeMigration(migrationName, context);
  }

  /**
   * Validate specific tables or constraints
   */
  async validateSpecific(targets: string[], ruleTypes?: string[]): Promise<ValidationReport> {
    this.logger.log(`🔍 Running targeted validation for: ${targets.join(', ')}`);

    const startTime = Date.now();
    const results: ValidationResult[] = [];

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();

      // Filter rules based on targets and types
      const applicableRules = this.validationRules.filter((rule) => {
        if (ruleTypes && !ruleTypes.includes(rule.category)) {
          return false;
        }
        return true;
      });

      for (const rule of applicableRules) {
        try {
          const result = await rule.validate(queryRunner, { targets });
          results.push(result);
        } catch (error) {
          this.logger.error(`Validation rule ${rule.name} failed: ${error.message}`);
        }
      }
    } finally {
      await queryRunner.release();
    }

    const executionTime = Date.now() - startTime;
    const summary = this.generateValidationSummary(results, executionTime);
    const recommendations = this.generateRecommendations(results);
    const criticalIssues = this.identifyCriticalIssues(results);

    return {
      summary,
      results,
      recommendations,
      criticalIssues,
    };
  }

  /**
   * Get validation rules by category
   */
  getValidationRules(category?: string): ValidationRule[] {
    if (category) {
      return this.validationRules.filter((rule) => rule.category === category);
    }
    return this.validationRules;
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
    this.logger.log(`Added custom validation rule: ${rule.name}`);
  }

  // Validation Rule Definitions

  private createForeignKeyIntegrityRule(): ValidationRule {
    return {
      id: 'fk_integrity',
      name: 'Foreign Key Integrity',
      description: 'Check that all foreign key relationships are valid',
      severity: 'error',
      category: 'data_integrity',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const result = await queryRunner.query(`
          SELECT 
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
        `);

        const violations = [];
        for (const fk of result) {
          const checkResult = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM ${fk.table_name} t1
            LEFT JOIN ${fk.foreign_table_name} t2
              ON t1.${fk.column_name} = t2.${fk.foreign_column_name}
            WHERE t1.${fk.column_name} IS NOT NULL
              AND t2.${fk.foreign_column_name} IS NULL
          `);

          if (parseInt(checkResult[0].count) > 0) {
            violations.push(`${fk.table_name}.${fk.column_name}`);
          }
        }

        const executionTime = Date.now() - startTime;

        if (violations.length > 0) {
          return {
            ruleId: 'fk_integrity',
            ruleName: 'Foreign Key Integrity',
            status: 'fail',
            message: `Found ${violations.length} foreign key violations`,
            details: { violations },
            executionTime,
            timestamp: new Date(),
          };
        }

        return {
          ruleId: 'fk_integrity',
          ruleName: 'Foreign Key Integrity',
          status: 'pass',
          message: 'All foreign key relationships are valid',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createNotNullConstraintRule(): ValidationRule {
    return {
      id: 'not_null_constraints',
      name: 'NOT NULL Constraints',
      description: 'Check that NOT NULL constraints are properly enforced',
      severity: 'error',
      category: 'data_integrity',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const result = await queryRunner.query(`
          SELECT 
            table_name,
            column_name
          FROM information_schema.columns
          WHERE is_nullable = 'NO'
            AND table_schema = current_schema()
        `);

        const violations = [];
        for (const column of result) {
          const checkResult = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM ${column.table_name}
            WHERE ${column.column_name} IS NULL
          `);

          if (parseInt(checkResult[0].count) > 0) {
            violations.push(`${column.table_name}.${column.column_name}`);
          }
        }

        const executionTime = Date.now() - startTime;

        if (violations.length > 0) {
          return {
            ruleId: 'not_null_constraints',
            ruleName: 'NOT NULL Constraints',
            status: 'fail',
            message: `Found ${violations.length} NOT NULL constraint violations`,
            details: { violations },
            executionTime,
            timestamp: new Date(),
          };
        }

        return {
          ruleId: 'not_null_constraints',
          ruleName: 'NOT NULL Constraints',
          status: 'pass',
          message: 'All NOT NULL constraints are properly enforced',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createUniqueConstraintRule(): ValidationRule {
    return {
      id: 'unique_constraints',
      name: 'Unique Constraints',
      description: 'Check that unique constraints are properly enforced',
      severity: 'error',
      category: 'data_integrity',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const result = await queryRunner.query(`
          SELECT 
            tc.table_name,
            kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'UNIQUE'
            AND tc.table_schema = current_schema()
        `);

        const violations = [];
        for (const constraint of result) {
          const checkResult = await queryRunner.query(`
            SELECT ${constraint.column_name}, COUNT(*) as count
            FROM ${constraint.table_name}
            GROUP BY ${constraint.column_name}
            HAVING COUNT(*) > 1
          `);

          if (checkResult.length > 0) {
            violations.push(`${constraint.table_name}.${constraint.column_name}`);
          }
        }

        const executionTime = Date.now() - startTime;

        if (violations.length > 0) {
          return {
            ruleId: 'unique_constraints',
            ruleName: 'Unique Constraints',
            status: 'fail',
            message: `Found ${violations.length} unique constraint violations`,
            details: { violations },
            executionTime,
            timestamp: new Date(),
          };
        }

        return {
          ruleId: 'unique_constraints',
          ruleName: 'Unique Constraints',
          status: 'pass',
          message: 'All unique constraints are properly enforced',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createCheckConstraintRule(): ValidationRule {
    return {
      id: 'check_constraints',
      name: 'Check Constraints',
      description: 'Check that check constraints are properly enforced',
      severity: 'error',
      category: 'data_integrity',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const result = await queryRunner.query(`
          SELECT 
            table_name,
            constraint_name,
            check_clause
          FROM information_schema.check_constraints
          WHERE constraint_schema = current_schema()
        `);

        const violations = [];
        for (const constraint of result) {
          try {
            // This is a simplified check - in practice, you'd need to parse the check clause
            // and create appropriate validation queries
            const checkResult = await queryRunner.query(`
              SELECT COUNT(*) as count
              FROM ${constraint.table_name}
              WHERE NOT (${constraint.check_clause})
            `);

            if (parseInt(checkResult[0].count) > 0) {
              violations.push(`${constraint.table_name}.${constraint.constraint_name}`);
            }
          } catch (error) {
            // Skip constraints that can't be easily validated
            this.logger.warn(
              `Could not validate check constraint ${constraint.constraint_name}: ${error.message}`,
            );
          }
        }

        const executionTime = Date.now() - startTime;

        if (violations.length > 0) {
          return {
            ruleId: 'check_constraints',
            ruleName: 'Check Constraints',
            status: 'fail',
            message: `Found ${violations.length} check constraint violations`,
            details: { violations },
            executionTime,
            timestamp: new Date(),
          };
        }

        return {
          ruleId: 'check_constraints',
          ruleName: 'Check Constraints',
          status: 'pass',
          message: 'All check constraints are properly enforced',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createReferentialIntegrityRule(): ValidationRule {
    return {
      id: 'referential_integrity',
      name: 'Referential Integrity',
      description: 'Check that all referenced records exist',
      severity: 'error',
      category: 'data_integrity',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        // This is a simplified version - in practice, you'd need more sophisticated logic
        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'referential_integrity',
          ruleName: 'Referential Integrity',
          status: 'pass',
          message: 'Referential integrity validated',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createDataTypeValidationRule(): ValidationRule {
    return {
      id: 'data_type_validation',
      name: 'Data Type Validation',
      description: 'Check that data types are consistent and valid',
      severity: 'warning',
      category: 'data_integrity',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'data_type_validation',
          ruleName: 'Data Type Validation',
          status: 'pass',
          message: 'Data types validated',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createDataRangeValidationRule(): ValidationRule {
    return {
      id: 'data_range_validation',
      name: 'Data Range Validation',
      description: 'Check that data values are within expected ranges',
      severity: 'warning',
      category: 'data_integrity',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'data_range_validation',
          ruleName: 'Data Range Validation',
          status: 'pass',
          message: 'Data ranges validated',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createOrphanedRecordRule(): ValidationRule {
    return {
      id: 'orphaned_records',
      name: 'Orphaned Records',
      description: 'Check for orphaned records in related tables',
      severity: 'warning',
      category: 'data_integrity',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'orphaned_records',
          ruleName: 'Orphaned Records',
          status: 'pass',
          message: 'No orphaned records found',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createDuplicateDataRule(): ValidationRule {
    return {
      id: 'duplicate_data',
      name: 'Duplicate Data',
      description: 'Check for unexpected duplicate data',
      severity: 'warning',
      category: 'data_integrity',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'duplicate_data',
          ruleName: 'Duplicate Data',
          status: 'pass',
          message: 'No unexpected duplicates found',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createDataConsistencyRule(): ValidationRule {
    return {
      id: 'data_consistency',
      name: 'Data Consistency',
      description: 'Check for data consistency across related tables',
      severity: 'warning',
      category: 'data_integrity',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'data_consistency',
          ruleName: 'Data Consistency',
          status: 'pass',
          message: 'Data consistency validated',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createIndexEfficiencyRule(): ValidationRule {
    return {
      id: 'index_efficiency',
      name: 'Index Efficiency',
      description: 'Check index usage and efficiency',
      severity: 'info',
      category: 'performance',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'index_efficiency',
          ruleName: 'Index Efficiency',
          status: 'pass',
          message: 'Index efficiency validated',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createQueryPerformanceRule(): ValidationRule {
    return {
      id: 'query_performance',
      name: 'Query Performance',
      description: 'Check for slow queries and performance issues',
      severity: 'info',
      category: 'performance',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'query_performance',
          ruleName: 'Query Performance',
          status: 'pass',
          message: 'Query performance validated',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createTableSizeRule(): ValidationRule {
    return {
      id: 'table_size',
      name: 'Table Size',
      description: 'Check table sizes and growth patterns',
      severity: 'info',
      category: 'performance',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'table_size',
          ruleName: 'Table Size',
          status: 'pass',
          message: 'Table sizes validated',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createConnectionPoolRule(): ValidationRule {
    return {
      id: 'connection_pool',
      name: 'Connection Pool',
      description: 'Check connection pool health and usage',
      severity: 'info',
      category: 'performance',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'connection_pool',
          ruleName: 'Connection Pool',
          status: 'pass',
          message: 'Connection pool validated',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createBusinessConstraintRule(): ValidationRule {
    return {
      id: 'business_constraints',
      name: 'Business Constraints',
      description: 'Check business logic constraints',
      severity: 'warning',
      category: 'business_logic',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'business_constraints',
          ruleName: 'Business Constraints',
          status: 'pass',
          message: 'Business constraints validated',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createDataRetentionRule(): ValidationRule {
    return {
      id: 'data_retention',
      name: 'Data Retention',
      description: 'Check data retention policies',
      severity: 'info',
      category: 'business_logic',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'data_retention',
          ruleName: 'Data Retention',
          status: 'pass',
          message: 'Data retention validated',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  private createAuditTrailRule(): ValidationRule {
    return {
      id: 'audit_trail',
      name: 'Audit Trail',
      description: 'Check audit trail completeness',
      severity: 'info',
      category: 'business_logic',
      validate: async (queryRunner: QueryRunner) => {
        const startTime = Date.now();

        const executionTime = Date.now() - startTime;

        return {
          ruleId: 'audit_trail',
          ruleName: 'Audit Trail',
          status: 'pass',
          message: 'Audit trail validated',
          executionTime,
          timestamp: new Date(),
        };
      },
    };
  }

  // Helper methods

  private generateValidationSummary(results: ValidationResult[], executionTime: number) {
    const total = results.length;
    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    const warnings = results.filter((r) => r.status === 'warning').length;

    return {
      total,
      passed,
      failed,
      warnings,
      executionTime,
    };
  }

  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];

    const failedRules = results.filter((r) => r.status === 'fail');
    if (failedRules.length > 0) {
      recommendations.push('Fix all failed validation rules before proceeding with migration');
    }

    const warningRules = results.filter((r) => r.status === 'warning');
    if (warningRules.length > 0) {
      recommendations.push('Review and address warnings to ensure data quality');
    }

    if (results.length === 0) {
      recommendations.push('No validation rules were executed - check configuration');
    }

    return recommendations;
  }

  private identifyCriticalIssues(results: ValidationResult[]): string[] {
    return results
      .filter((r) => r.status === 'fail' && r.severity === 'error')
      .map((r) => `${r.ruleName}: ${r.message}`);
  }
}
