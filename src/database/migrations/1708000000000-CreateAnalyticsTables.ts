import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAnalyticsTables1708000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create analytics_reports table
    await queryRunner.createTable(
      new Table({
        name: 'analytics_reports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reportType',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
          },
          {
            name: 'configuration',
            type: 'jsonb',
          },
          {
            name: 'data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'visualizations',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'insights',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
          },
          {
            name: 'completedAt',
            type: 'timestamp',
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

    // Create report_schedules table
    await queryRunner.createTable(
      new Table({
        name: 'report_schedules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reportConfiguration',
            type: 'jsonb',
          },
          {
            name: 'frequency',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'recipients',
            type: 'jsonb',
          },
          {
            name: 'exportFormats',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'lastRunAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'nextRunAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
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

    // Create data_snapshots table
    await queryRunner.createTable(
      new Table({
        name: 'data_snapshots',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'snapshotType',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'snapshotDate',
            type: 'date',
          },
          {
            name: 'data',
            type: 'jsonb',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create analytics_cache table
    await queryRunner.createTable(
      new Table({
        name: 'analytics_cache',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cacheKey',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'data',
            type: 'jsonb',
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'analytics_reports',
      new TableIndex({
        name: 'IDX_analytics_reports_created_by_created_at',
        columnNames: ['created_by_id', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'analytics_reports',
      new TableIndex({
        name: 'IDX_analytics_reports_type_status',
        columnNames: ['reportType', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'data_snapshots',
      new TableIndex({
        name: 'IDX_data_snapshots_type_date',
        columnNames: ['snapshotType', 'snapshotDate'],
      }),
    );

    await queryRunner.createIndex(
      'analytics_cache',
      new TableIndex({
        name: 'IDX_analytics_cache_key_expires',
        columnNames: ['cacheKey', 'expiresAt'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'analytics_reports',
      new TableForeignKey({
        columnNames: ['created_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'report_schedules',
      new TableForeignKey({
        columnNames: ['created_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('analytics_cache');
    await queryRunner.dropTable('data_snapshots');
    await queryRunner.dropTable('report_schedules');
    await queryRunner.dropTable('analytics_reports');
  }
}
