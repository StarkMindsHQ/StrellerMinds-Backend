import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddPerformanceIndexes1735300000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add composite indexes for common query patterns

        // User-related indexes
        await queryRunner.createIndex(
            'users',
            new TableIndex({
                name: 'IDX_USERS_EMAIL_STATUS',
                columnNames: ['email', 'status'],
            }),
        );

        await queryRunner.createIndex(
            'users',
            new TableIndex({
                name: 'IDX_USERS_CREATED_AT',
                columnNames: ['createdAt'],
            }),
        );

        // Payment-related indexes (additional to entity indexes)
        await queryRunner.createIndex(
            'payments',
            new TableIndex({
                name: 'IDX_PAYMENTS_CREATED_AT',
                columnNames: ['createdAt'],
            }),
        );

        // Subscription indexes
        await queryRunner.createIndex(
            'subscriptions',
            new TableIndex({
                name: 'IDX_SUBSCRIPTIONS_USER_STATUS',
                columnNames: ['userId', 'status'],
            }),
        );

        await queryRunner.createIndex(
            'subscriptions',
            new TableIndex({
                name: 'IDX_SUBSCRIPTIONS_END_DATE',
                columnNames: ['endDate'],
            }),
        );

        // Email queue indexes
        await queryRunner.createIndex(
            'email_queue',
            new TableIndex({
                name: 'IDX_EMAIL_QUEUE_STATUS_SCHEDULED',
                columnNames: ['status', 'scheduledAt'],
            }),
        );

        await queryRunner.createIndex(
            'email_queue',
            new TableIndex({
                name: 'IDX_EMAIL_QUEUE_USER_ID',
                columnNames: ['userId'],
            }),
        );

        // User profile indexes
        await queryRunner.createIndex(
            'user_profiles',
            new TableIndex({
                name: 'IDX_USER_PROFILES_USER_ID',
                columnNames: ['userId'],
                isUnique: true,
            }),
        );

        // Partial index for active users (PostgreSQL specific)
        await queryRunner.query(`
      CREATE INDEX IDX_USERS_ACTIVE 
      ON users (id) 
      WHERE status = 'active' AND "deletedAt" IS NULL
    `);

        // Partial index for published courses
        await queryRunner.query(`
      CREATE INDEX IDX_COURSES_PUBLISHED 
      ON courses (id, "publishedAt") 
      WHERE status = 'published' AND "deletedAt" IS NULL
    `);

        // Partial index for pending payments
        await queryRunner.query(`
      CREATE INDEX IDX_PAYMENTS_PENDING 
      ON payments (id, "createdAt") 
      WHERE status = 'pending'
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop custom partial indexes
        await queryRunner.query('DROP INDEX IF EXISTS IDX_PAYMENTS_PENDING');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_COURSES_PUBLISHED');
        await queryRunner.query('DROP INDEX IF EXISTS IDX_USERS_ACTIVE');

        // Drop composite indexes
        await queryRunner.dropIndex('user_profiles', 'IDX_USER_PROFILES_USER_ID');
        await queryRunner.dropIndex('email_queue', 'IDX_EMAIL_QUEUE_USER_ID');
        await queryRunner.dropIndex('email_queue', 'IDX_EMAIL_QUEUE_STATUS_SCHEDULED');
        await queryRunner.dropIndex('subscriptions', 'IDX_SUBSCRIPTIONS_END_DATE');
        await queryRunner.dropIndex('subscriptions', 'IDX_SUBSCRIPTIONS_USER_STATUS');
        await queryRunner.dropIndex('payments', 'IDX_PAYMENTS_CREATED_AT');
        await queryRunner.dropIndex('users', 'IDX_USERS_CREATED_AT');
        await queryRunner.dropIndex('users', 'IDX_USERS_EMAIL_STATUS');
    }
}
