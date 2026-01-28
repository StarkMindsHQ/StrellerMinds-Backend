import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBackupTables1769400000000 implements MigrationInterface {
  name = 'CreateBackupTables1769400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create backup_type enum
    await queryRunner.query(`
      CREATE TYPE "backup_type_enum" AS ENUM ('full', 'incremental', 'wal', 'snapshot')
    `);

    // Create backup_status enum
    await queryRunner.query(`
      CREATE TYPE "backup_status_enum" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'verified', 'replicated', 'deleted')
    `);

    // Create retention_tier enum
    await queryRunner.query(`
      CREATE TYPE "retention_tier_enum" AS ENUM ('daily', 'weekly', 'monthly', 'yearly')
    `);

    // Create recovery_test_status enum
    await queryRunner.query(`
      CREATE TYPE "recovery_test_status_enum" AS ENUM ('pending', 'running', 'passed', 'failed')
    `);

    // Create backup_records table
    await queryRunner.createTable(
      new Table({
        name: 'backup_records',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'filename',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'type',
            type: 'backup_type_enum',
            default: `'full'`,
          },
          {
            name: 'status',
            type: 'backup_status_enum',
            default: `'pending'`,
          },
          {
            name: 'size_bytes',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'compressed_size_bytes',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'checksum_sha256',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'is_encrypted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'encryption_key_id',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'is_compressed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'storage_locations',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'local_path',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 's3_primary_key',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 's3_replica_key',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 's3_primary_bucket',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 's3_replica_bucket',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'duration_ms',
            type: 'int',
            default: 0,
          },
          {
            name: 'database_version',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'postgres_version',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'replicated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'retention_tier',
            type: 'retention_tier_enum',
            isNullable: true,
          },
          {
            name: 'schedule_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for backup_records
    await queryRunner.createIndex(
      'backup_records',
      new TableIndex({
        name: 'IDX_backup_records_filename',
        columnNames: ['filename'],
      }),
    );

    await queryRunner.createIndex(
      'backup_records',
      new TableIndex({
        name: 'IDX_backup_records_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'backup_records',
      new TableIndex({
        name: 'IDX_backup_records_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'backup_records',
      new TableIndex({
        name: 'IDX_backup_records_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'backup_records',
      new TableIndex({
        name: 'IDX_backup_records_retention_tier',
        columnNames: ['retention_tier'],
      }),
    );

    await queryRunner.createIndex(
      'backup_records',
      new TableIndex({
        name: 'IDX_backup_records_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    // Create backup_schedules table
    await queryRunner.createTable(
      new Table({
        name: 'backup_schedules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'cron_expression',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'backup_type',
            type: 'backup_type_enum',
            default: `'full'`,
          },
          {
            name: 'is_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'compress',
            type: 'boolean',
            default: true,
          },
          {
            name: 'encrypt',
            type: 'boolean',
            default: true,
          },
          {
            name: 'verify',
            type: 'boolean',
            default: true,
          },
          {
            name: 'replicate_cross_region',
            type: 'boolean',
            default: true,
          },
          {
            name: 'upload_to_cloud',
            type: 'boolean',
            default: true,
          },
          {
            name: 'retention_days',
            type: 'int',
            default: 30,
          },
          {
            name: 'last_run_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'next_run_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_backup_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'last_status',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create recovery_tests table
    await queryRunner.createTable(
      new Table({
        name: 'recovery_tests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'backup_record_id',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'recovery_test_status_enum',
            default: `'pending'`,
          },
          {
            name: 'duration_ms',
            type: 'int',
            default: 0,
          },
          {
            name: 'tables_restored',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'rows_verified',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'integrity_check_passed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'checksum_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'test_results',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'test_database_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for recovery_tests
    await queryRunner.createIndex(
      'recovery_tests',
      new TableIndex({
        name: 'IDX_recovery_tests_backup_record_id',
        columnNames: ['backup_record_id'],
      }),
    );

    await queryRunner.createIndex(
      'recovery_tests',
      new TableIndex({
        name: 'IDX_recovery_tests_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Insert default backup schedules
    await queryRunner.query(`
      INSERT INTO backup_schedules (id, name, cron_expression, backup_type, description)
      VALUES
        (gen_random_uuid(), 'Daily Backup', '0 2 * * *', 'full', 'Automated daily backup at 2:00 AM UTC'),
        (gen_random_uuid(), 'Weekly Backup', '0 3 * * 0', 'full', 'Automated weekly backup on Sunday at 3:00 AM UTC'),
        (gen_random_uuid(), 'Monthly Backup', '0 4 1 * *', 'full', 'Automated monthly backup on 1st of month at 4:00 AM UTC')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.dropTable('recovery_tests', true);
    await queryRunner.dropTable('backup_schedules', true);
    await queryRunner.dropTable('backup_records', true);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "recovery_test_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "retention_tier_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "backup_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "backup_type_enum"`);
  }
}
