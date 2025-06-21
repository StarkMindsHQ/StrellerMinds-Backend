import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateNotificationsTables1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'title', type: 'varchar' },
          { name: 'body', type: 'text' },
          { name: 'imageUrl', type: 'varchar', isNullable: true },
          { name: 'clickAction', type: 'varchar', isNullable: true },
          {
            name: 'platform',
            type: 'enum',
            enum: ['ios', 'android', 'web', 'all'],
            default: "'all'",
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'normal', 'high'],
            default: "'normal'",
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['course_update', 'assignment_due', 'achievement_unlocked', 'announcement', 'reminder', 'marketing', 'system'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'sent', 'failed', 'cancelled'],
            default: "'pending'",
          },
          { name: 'data', type: 'json', isNullable: true },
          { name: 'deviceTokens', type: 'json', isNullable: true },
          { name: 'userId', type: 'uuid', isNullable: true },
          { name: 'topic', type: 'varchar', isNullable: true },
          { name: 'scheduledAt', type: 'timestamp', isNullable: true },
          { name: 'sentAt', type: 'timestamp', isNullable: true },
          { name: 'silent', type: 'boolean', default: false },
          { name: 'errorMessage', type: 'text', isNullable: true },
          { name: 'retryCount', type: 'int', default: 0 },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'notifications',
      new Index('IDX_notifications_userId_createdAt', ['userId', 'createdAt'])
    );

    await queryRunner.createIndex(
      'notifications',
      new Index('IDX_notifications_status_scheduledAt', ['status', 'scheduledAt'])
    );

    await queryRunner.createTable(
      new Table({
        name: 'device_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid' },
          { name: 'token', type: 'varchar' },
          {
            name: 'platform',
            type: 'enum',
            enum: ['ios', 'android', 'web'],
          },
          { name: 'active', type: 'boolean', default: true },
          { name: 'deviceId', type: 'varchar', isNullable: true },
          { name: 'appVersion', type: 'varchar', isNullable: true },
          { name: 'lastUsedAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
        uniques: [
          { columnNames: ['userId', 'token'] }
        ]
      }),
      true
    );

    await queryRunner.createIndex(
      'device_tokens',
      new Index('IDX_device_tokens_userId_platform', ['userId', 'platform'])
    );

    await queryRunner.createTable(
      new Table({
        name: 'notification_preferences',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid', isUnique: true },
          { name: 'courseUpdates', type: 'boolean', default: true },
          { name: 'assignments', type: 'boolean', default: true },
          { name: 'announcements', type: 'boolean', default: true },
          { name: 'achievements', type: 'boolean', default: true },
          { name: 'reminders', type: 'boolean', default: true },
          { name: 'marketing', type: 'boolean', default: false },
          { name: 'mutedTopics', type: 'json', isNullable: true },
          { name: 'quietHoursStart', type: 'varchar', isNullable: true },
          { name: 'quietHoursEnd', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notification_preferences');
    await queryRunner.dropTable('device_tokens');
    await queryRunner.dropTable('notifications');
  }
}
