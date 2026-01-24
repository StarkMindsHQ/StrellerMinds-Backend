import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateIntegrationTables1704900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create integration_configs table
    await queryRunner.createTable(
      new Table({
        name: 'integration_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'integrationType',
            type: 'enum',
            enum: ['lti', 'zoom', 'google', 'microsoft', 'sso'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'suspended', 'pending'],
            default: "'pending'",
          },
          {
            name: 'credentials',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'externalId',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'displayName',
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
          {
            name: 'lastSyncAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastSyncStatus',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'syncCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'integration_configs',
      new TableIndex({
        name: 'IDX_integration_userId_type',
        columns: ['userId', 'integrationType'],
        isUnique: true,
      }),
    );

    // Create sync_logs table
    await queryRunner.createTable(
      new Table({
        name: 'sync_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'integrationConfigId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'in_progress', 'success', 'failed', 'partial'],
            default: "'pending'",
          },
          {
            name: 'direction',
            type: 'enum',
            enum: ['push', 'pull', 'bidirectional'],
            isNullable: false,
          },
          {
            name: 'resourceType',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'itemsProcessed',
            type: 'int',
            default: 0,
          },
          {
            name: 'itemsFailed',
            type: 'int',
            default: 0,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'syncData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'durationMs',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['integrationConfigId'],
            referencedTableName: 'integration_configs',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sync_logs',
      new TableIndex({
        name: 'IDX_sync_logs_config_date',
        columns: ['integrationConfigId', 'startedAt'],
        isUnique: false,
      }),
    );

    await queryRunner.createIndex(
      'sync_logs',
      new TableIndex({
        name: 'IDX_sync_logs_status_date',
        columns: ['status', 'startedAt'],
        isUnique: false,
      }),
    );

    // Create integration_mappings table
    await queryRunner.createTable(
      new Table({
        name: 'integration_mappings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'integrationConfigId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'localResourceId',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'localResourceType',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'externalResourceId',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'externalResourceType',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'externalPlatform',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'mappingData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'syncStatus',
            type: 'jsonb',
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
          {
            name: 'lastSyncAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['integrationConfigId'],
            referencedTableName: 'integration_configs',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'integration_mappings',
      new TableIndex({
        name: 'IDX_integration_mappings_config_local',
        columns: ['integrationConfigId', 'localResourceId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('integration_mappings', 'IDX_integration_mappings_config_local');
    await queryRunner.dropTable('integration_mappings');

    await queryRunner.dropIndex('sync_logs', 'IDX_sync_logs_status_date');
    await queryRunner.dropIndex('sync_logs', 'IDX_sync_logs_config_date');
    await queryRunner.dropTable('sync_logs');

    await queryRunner.dropIndex('integration_configs', 'IDX_integration_userId_type');
    await queryRunner.dropTable('integration_configs');
  }
}
