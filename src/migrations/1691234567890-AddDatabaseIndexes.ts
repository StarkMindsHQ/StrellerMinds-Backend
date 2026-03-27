import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class AddDatabaseIndexes1691234567890 implements MigrationInterface {
  name = 'AddDatabaseIndexes1691234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // User table indexes
    await queryRunner.createIndex(
      'users',
      new Index('IDX_USERS_STATUS', ['status'])
    );

    await queryRunner.createIndex(
      'users',
      new Index('IDX_USERS_CREATED_AT', ['createdAt'])
    );

    await queryRunner.createIndex(
      'users',
      new Index('IDX_USERS_LAST_LOGIN', ['lastLogin'])
    );

    await queryRunner.createIndex(
      'users',
      new Index('IDX_USERS_EMAIL_VERIFIED', ['emailVerified'])
    );

    await queryRunner.createIndex(
      'users',
      new Index('IDX_USERS_STATUS_CREATED_AT', ['status', 'createdAt'])
    );

    await queryRunner.createIndex(
      'users',
      new Index('IDX_USERS_ROLES', ['roles'])
    );

    // User activities table indexes
    await queryRunner.createIndex(
      'user_activities',
      new Index('IDX_USER_ACTIVITIES_TYPE', ['type'])
    );

    await queryRunner.createIndex(
      'user_activities',
      new Index('IDX_USER_ACTIVITIES_CREATED_AT', ['createdAt'])
    );

    await queryRunner.createIndex(
      'user_activities',
      new Index('IDX_USER_ACTIVITIES_PERFORMED_BY', ['performedBy'])
    );

    await queryRunner.createIndex(
      'user_activities',
      new Index('IDX_USER_ACTIVITIES_USER_TYPE_CREATED_AT', ['userId', 'type', 'createdAt'])
    );

    // Courses table indexes
    await queryRunner.createIndex(
      'courses',
      new Index('IDX_COURSES_STATUS', ['status'])
    );

    await queryRunner.createIndex(
      'courses',
      new Index('IDX_COURSES_CREATED_AT', ['createdAt'])
    );

    await queryRunner.createIndex(
      'courses',
      new Index('IDX_COURSES_LEVEL', ['level'])
    );

    await queryRunner.createIndex(
      'courses',
      new Index('IDX_COURSES_LANGUAGE', ['language'])
    );

    await queryRunner.createIndex(
      'courses',
      new Index('IDX_COURSES_PRICE', ['price'])
    );

    // Analytics reports table indexes
    await queryRunner.createIndex(
      'analytics_reports',
      new Index('IDX_ANALYTICS_REPORTS_CREATED_BY_ID', ['createdById'])
    );

    await queryRunner.createIndex(
      'analytics_reports',
      new Index('IDX_ANALYTICS_REPORTS_REPORT_TYPE', ['reportType'])
    );

    await queryRunner.createIndex(
      'analytics_reports',
      new Index('IDX_ANALYTICS_REPORTS_STATUS', ['status'])
    );

    await queryRunner.createIndex(
      'analytics_reports',
      new Index('IDX_ANALYTICS_REPORTS_CREATED_AT', ['createdAt'])
    );

    // Enable pg_stat_statements for query monitoring
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop user table indexes
    await queryRunner.dropIndex('users', 'IDX_USERS_STATUS');
    await queryRunner.dropIndex('users', 'IDX_USERS_CREATED_AT');
    await queryRunner.dropIndex('users', 'IDX_USERS_LAST_LOGIN');
    await queryRunner.dropIndex('users', 'IDX_USERS_EMAIL_VERIFIED');
    await queryRunner.dropIndex('users', 'IDX_USERS_STATUS_CREATED_AT');
    await queryRunner.dropIndex('users', 'IDX_USERS_ROLES');

    // Drop user activities table indexes
    await queryRunner.dropIndex('user_activities', 'IDX_USER_ACTIVITIES_TYPE');
    await queryRunner.dropIndex('user_activities', 'IDX_USER_ACTIVITIES_CREATED_AT');
    await queryRunner.dropIndex('user_activities', 'IDX_USER_ACTIVITIES_PERFORMED_BY');
    await queryRunner.dropIndex('user_activities', 'IDX_USER_ACTIVITIES_USER_TYPE_CREATED_AT');

    // Drop courses table indexes
    await queryRunner.dropIndex('courses', 'IDX_COURSES_STATUS');
    await queryRunner.dropIndex('courses', 'IDX_COURSES_CREATED_AT');
    await queryRunner.dropIndex('courses', 'IDX_COURSES_LEVEL');
    await queryRunner.dropIndex('courses', 'IDX_COURSES_LANGUAGE');
    await queryRunner.dropIndex('courses', 'IDX_COURSES_PRICE');

    // Drop analytics reports table indexes
    await queryRunner.dropIndex('analytics_reports', 'IDX_ANALYTICS_REPORTS_CREATED_BY_ID');
    await queryRunner.dropIndex('analytics_reports', 'IDX_ANALYTICS_REPORTS_REPORT_TYPE');
    await queryRunner.dropIndex('analytics_reports', 'IDX_ANALYTICS_REPORTS_STATUS');
    await queryRunner.dropIndex('analytics_reports', 'IDX_ANALYTICS_REPORTS_CREATED_AT');
  }
}
