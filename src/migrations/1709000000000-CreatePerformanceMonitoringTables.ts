import { MigrationInterface, QueryRunner, Table, TableIndex, TableColumn } from 'typeorm';

export class CreatePerformanceMonitoringTables1709000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create performance_metrics table
    await queryRunner.createTable(
      new Table({
        name: 'performance_metrics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['http_request', 'database_query', 'cache_operation', 'external_api', 'background_job', 'custom'],
          },
          {
            name: 'endpoint',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'method',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'float',
          },
          {
            name: 'statusCode',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'critical'],
            default: "'low'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'query',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'rowsAffected',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'cacheHit',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'cacheMiss',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'memoryUsage',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'cpuUsage',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'userId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'requestId',
            type: 'varchar',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for performance_metrics
    await queryRunner.createIndex(
      'performance_metrics',
      new TableIndex({
        name: 'IDX_performance_metrics_timestamp_type',
        columnNames: ['timestamp', 'type'],
      }),
    );

    await queryRunner.createIndex(
      'performance_metrics',
      new TableIndex({
        name: 'IDX_performance_metrics_endpoint_method',
        columnNames: ['endpoint', 'method'],
      }),
    );

    await queryRunner.createIndex(
      'performance_metrics',
      new TableIndex({
        name: 'IDX_performance_metrics_severity',
        columnNames: ['severity'],
      }),
    );

    // Create performance_reports table
    await queryRunner.createTable(
      new Table({
        name: 'performance_reports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['daily', 'weekly', 'monthly', 'custom'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'generating', 'completed', 'failed'],
            default: "'pending'",
          },
          {
            name: 'startDate',
            type: 'timestamp',
          },
          {
            name: 'endDate',
            type: 'timestamp',
          },
          {
            name: 'metrics',
            type: 'jsonb',
          },
          {
            name: 'recommendations',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create query_optimizations table
    await queryRunner.createTable(
      new Table({
        name: 'query_optimizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'originalQuery',
            type: 'text',
          },
          {
            name: 'optimizedQuery',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tableName',
            type: 'varchar',
          },
          {
            name: 'originalDuration',
            type: 'float',
          },
          {
            name: 'optimizedDuration',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'improvement',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'analysis',
            type: 'jsonb',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'applied', 'rejected', 'failed'],
            default: "'pending'",
          },
          {
            name: 'recommendation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'appliedChanges',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'appliedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for query_optimizations
    await queryRunner.createIndex(
      'query_optimizations',
      new TableIndex({
        name: 'IDX_query_optimizations_status_createdAt',
        columnNames: ['status', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('query_optimizations', true);
    await queryRunner.dropTable('performance_reports', true);
    await queryRunner.dropTable('performance_metrics', true);
  }
}
