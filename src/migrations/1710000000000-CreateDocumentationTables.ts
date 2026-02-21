import { MigrationInterface, QueryRunner, Table, TableIndex, TableColumn, TableForeignKey } from 'typeorm';

export class CreateDocumentationTables1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create api_keys table
    await queryRunner.createTable(
      new Table({
        name: 'api_keys',
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
          },
          {
            name: 'key',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'keyPrefix',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'suspended', 'revoked'],
            default: "'active'",
          },
          {
            name: 'tier',
            type: 'enum',
            enum: ['free', 'basic', 'professional', 'enterprise'],
            default: "'free'",
          },
          {
            name: 'rateLimit',
            type: 'int',
            default: 1000,
          },
          {
            name: 'allowedIps',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'allowedOrigins',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastUsedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'requestCount',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'totalRequests',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'userId',
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

    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({
        name: 'IDX_api_keys_key_status',
        columnNames: ['key', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({
        name: 'IDX_api_keys_userId_status',
        columnNames: ['userId', 'status'],
      }),
    );

    await queryRunner.createForeignKey(
      'api_keys',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create api_usage table
    await queryRunner.createTable(
      new Table({
        name: 'api_usage',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'apiKeyId',
            type: 'uuid',
          },
          {
            name: 'endpoint',
            type: 'varchar',
          },
          {
            name: 'method',
            type: 'enum',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          },
          {
            name: 'statusCode',
            type: 'int',
          },
          {
            name: 'responseTime',
            type: 'int',
          },
          {
            name: 'requestSize',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'responseSize',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'queryParams',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'requestHeaders',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'errorDetails',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'api_usage',
      new TableIndex({
        name: 'IDX_api_usage_apiKeyId_timestamp',
        columnNames: ['apiKeyId', 'timestamp'],
      }),
    );

    await queryRunner.createIndex(
      'api_usage',
      new TableIndex({
        name: 'IDX_api_usage_endpoint_method_timestamp',
        columnNames: ['endpoint', 'method', 'timestamp'],
      }),
    );

    await queryRunner.createIndex(
      'api_usage',
      new TableIndex({
        name: 'IDX_api_usage_statusCode_timestamp',
        columnNames: ['statusCode', 'timestamp'],
      }),
    );

    await queryRunner.createForeignKey(
      'api_usage',
      new TableForeignKey({
        columnNames: ['apiKeyId'],
        referencedTableName: 'api_keys',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create api_versions table
    await queryRunner.createTable(
      new Table({
        name: 'api_versions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'version',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'deprecated', 'sunset', 'beta', 'alpha'],
            default: "'active'",
          },
          {
            name: 'releaseNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'releaseDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'deprecationDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sunsetDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'migrationGuide',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'breakingChanges',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isDefault',
            type: 'boolean',
            default: true,
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

    // Create api_endpoints table
    await queryRunner.createTable(
      new Table({
        name: 'api_endpoints',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'path',
            type: 'varchar',
          },
          {
            name: 'method',
            type: 'enum',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          },
          {
            name: 'summary',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'deprecated', 'removed'],
            default: "'active'",
          },
          {
            name: 'tags',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'parameters',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'requestBody',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'responses',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'codeExamples',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'rateLimit',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'authentication',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'deprecationDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'deprecationNotice',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'migrationPath',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'versionId',
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

    await queryRunner.createIndex(
      'api_endpoints',
      new TableIndex({
        name: 'IDX_api_endpoints_versionId_path_method',
        columnNames: ['versionId', 'path', 'method'],
      }),
    );

    await queryRunner.createForeignKey(
      'api_endpoints',
      new TableForeignKey({
        columnNames: ['versionId'],
        referencedTableName: 'api_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create sdk_downloads table
    await queryRunner.createTable(
      new Table({
        name: 'sdk_downloads',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'language',
            type: 'enum',
            enum: ['typescript', 'javascript', 'python', 'java', 'php', 'ruby', 'go', 'rust'],
          },
          {
            name: 'version',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['generating', 'ready', 'failed'],
            default: "'generating'",
          },
          {
            name: 'downloadUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'filePath',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'fileSize',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'downloadCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
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
            name: 'generatedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sdk_downloads',
      new TableIndex({
        name: 'IDX_sdk_downloads_userId_language',
        columnNames: ['userId', 'language'],
      }),
    );

    await queryRunner.createIndex(
      'sdk_downloads',
      new TableIndex({
        name: 'IDX_sdk_downloads_language_version',
        columnNames: ['language', 'version'],
      }),
    );

    await queryRunner.createForeignKey(
      'sdk_downloads',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sdk_downloads', true);
    await queryRunner.dropTable('api_endpoints', true);
    await queryRunner.dropTable('api_versions', true);
    await queryRunner.dropTable('api_usage', true);
    await queryRunner.dropTable('api_keys', true);
  }
}
