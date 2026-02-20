import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateEmailNotificationTables1732305600 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create email_templates table
    await queryRunner.createTable(
      new Table({
        name: 'email_templates',
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
            isUnique: true,
          },
          {
            name: 'type',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'subject',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'html_content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'text_content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'placeholders',
            type: 'json',
            default: "'{}'",
          },
          {
            name: 'languages',
            type: 'json',
            default: "'{}'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'uuid',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create email_queue table
    await queryRunner.createTable(
      new Table({
        name: 'email_queue',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'recipient_email',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'recipient_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'template_type',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'pending'",
          },
          {
            name: 'subject',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'html_content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'text_content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'template_data',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'max_retries',
            type: 'integer',
            default: 3,
          },
          {
            name: 'scheduled_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sent_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'delivered_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'opened_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'tracking_data',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'delivery_response',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'uuid',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create notification_preferences table
    await queryRunner.createTable(
      new Table({
        name: 'notification_preferences',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'preferences',
            type: 'json',
            default: "'{}'",
          },
          {
            name: 'email_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'sms_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'push_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'in_app_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'unsubscribe_token',
            type: 'varchar',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'unsubscribed_categories',
            type: 'text',
            isArray: true,
            default: "'{}'",
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'uuid',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create email_analytics table
    await queryRunner.createTable(
      new Table({
        name: 'email_analytics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'email_queue_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'recipient_email',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'subject',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sent_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'delivered_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'open_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'click_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'bounce_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'complaint_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'unsubscribe_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'metrics',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'event_logs',
            type: 'json',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_analytics', true);
    await queryRunner.dropTable('notification_preferences', true);
    await queryRunner.dropTable('email_queue', true);
    await queryRunner.dropTable('email_templates', true);
  }
}
