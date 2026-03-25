import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWebhookLogsTable1709000000000 implements MigrationInterface {
  name = 'CreateWebhookLogsTable1709000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhook_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['success', 'failed', 'retry'],
            default: "'success'",
          },
          {
            name: 'duration',
            type: 'int',
            default: 0,
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'headers',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'webhook_logs',
      new TableIndex({
        name: 'IDX_webhook_logs_provider_event_type',
        columnNames: ['provider', 'event_type'],
      }),
    );

    await queryRunner.createIndex(
      'webhook_logs',
      new TableIndex({
        name: 'IDX_webhook_logs_status_timestamp',
        columnNames: ['status', 'timestamp'],
      }),
    );

    await queryRunner.createIndex(
      'webhook_logs',
      new TableIndex({
        name: 'IDX_webhook_logs_timestamp',
        columnNames: ['timestamp'],
      }),
    );

    await queryRunner.createIndex(
      'webhook_logs',
      new TableIndex({
        name: 'IDX_webhook_logs_ip_address',
        columnNames: ['ip_address'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('webhook_logs');
  }
}
