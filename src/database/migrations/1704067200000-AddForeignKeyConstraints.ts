import { MigrationInterface, QueryRunner, ForeignKey, Index } from 'typeorm';

/**
 * Migration to add proper foreign key constraints across all entities
 * This migration ensures referential integrity and proper cascade behaviors
 */
export class AddForeignKeyConstraints1704067200000 implements MigrationInterface {
  name = 'AddForeignKeyConstraints1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔗 Adding foreign key constraints...');

    // Users table foreign key constraints
    await this.addUserConstraints(queryRunner);

    // Courses table foreign key constraints
    await this.addCourseConstraints(queryRunner);

    // Course modules foreign key constraints
    await this.addCourseModuleConstraints(queryRunner);

    // User progress foreign key constraints
    await this.addUserProgressConstraints(queryRunner);

    // Reviews foreign key constraints
    await this.addReviewConstraints(queryRunner);

    // Certificates foreign key constraints
    await this.addCertificateConstraints(queryRunner);

    // Auth tokens foreign key constraints
    await this.addAuthTokenConstraints(queryRunner);

    // Forum entities foreign key constraints
    await this.addForumConstraints(queryRunner);

    // Notification foreign key constraints
    await this.addNotificationConstraints(queryRunner);

    console.log('✅ Foreign key constraints added successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Removing foreign key constraints...');

    // Remove constraints in reverse order to avoid dependency issues
    await this.removeNotificationConstraints(queryRunner);
    await this.removeForumConstraints(queryRunner);
    await this.removeAuthTokenConstraints(queryRunner);
    await this.removeCertificateConstraints(queryRunner);
    await this.removeReviewConstraints(queryRunner);
    await this.removeUserProgressConstraints(queryRunner);
    await this.removeCourseModuleConstraints(queryRunner);
    await this.removeCourseConstraints(queryRunner);
    await this.removeUserConstraints(queryRunner);

    console.log('✅ Foreign key constraints removed successfully');
  }

  private async addUserConstraints(queryRunner: QueryRunner): Promise<void> {
    // User profile relationship
    await queryRunner.createForeignKey(
      'users',
      new ForeignKey({
        columnNames: ['userProfileId'],
        referencedTableName: 'user_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_users_user_profile',
      }),
    );

    // User settings relationship
    await queryRunner.createForeignKey(
      'users',
      new ForeignKey({
        columnNames: ['userSettingsId'],
        referencedTableName: 'user_settings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_users_user_settings',
      }),
    );

    // Wallet info relationship
    await queryRunner.createForeignKey(
      'users',
      new ForeignKey({
        columnNames: ['walletInfoId'],
        referencedTableName: 'wallet_info',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_users_wallet_info',
      }),
    );
  }

  private async addCourseConstraints(queryRunner: QueryRunner): Promise<void> {
    // Course instructor relationship
    await queryRunner.createForeignKey(
      'courses',
      new ForeignKey({
        columnNames: ['instructorId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_courses_instructor',
      }),
    );

    // Course category relationship
    await queryRunner.createForeignKey(
      'courses',
      new ForeignKey({
        columnNames: ['categoryId'],
        referencedTableName: 'categories',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        name: 'FK_courses_category',
      }),
    );

    // Course enrollments junction table
    await queryRunner.createForeignKey(
      'course_enrollments',
      new ForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_course_enrollments_course',
      }),
    );

    await queryRunner.createForeignKey(
      'course_enrollments',
      new ForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_course_enrollments_user',
      }),
    );
  }

  private async addCourseModuleConstraints(queryRunner: QueryRunner): Promise<void> {
    // Course module to course relationship
    await queryRunner.createForeignKey(
      'course_modules',
      new ForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_course_modules_course',
      }),
    );

    // Lesson to course module relationship
    await queryRunner.createForeignKey(
      'lessons',
      new ForeignKey({
        columnNames: ['moduleId'],
        referencedTableName: 'course_modules',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_lessons_module',
      }),
    );
  }

  private async addUserProgressConstraints(queryRunner: QueryRunner): Promise<void> {
    // User progress to user relationship
    await queryRunner.createForeignKey(
      'user_progress',
      new ForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_user_progress_user',
      }),
    );

    // User progress to course relationship
    await queryRunner.createForeignKey(
      'user_progress',
      new ForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_user_progress_course',
      }),
    );

    // User progress to lesson relationship
    await queryRunner.createForeignKey(
      'user_progress',
      new ForeignKey({
        columnNames: ['lessonId'],
        referencedTableName: 'lessons',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_user_progress_lesson',
      }),
    );
  }

  private async addReviewConstraints(queryRunner: QueryRunner): Promise<void> {
    // Course review to user relationship
    await queryRunner.createForeignKey(
      'course_reviews',
      new ForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_course_reviews_user',
      }),
    );

    // Course review to course relationship
    await queryRunner.createForeignKey(
      'course_reviews',
      new ForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_course_reviews_course',
      }),
    );
  }

  private async addCertificateConstraints(queryRunner: QueryRunner): Promise<void> {
    // Certificate to user relationship
    await queryRunner.createForeignKey(
      'certificates',
      new ForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_certificates_user',
      }),
    );

    // Certificate to course relationship
    await queryRunner.createForeignKey(
      'certificates',
      new ForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_certificates_course',
      }),
    );
  }

  private async addAuthTokenConstraints(queryRunner: QueryRunner): Promise<void> {
    // Auth token to user relationship
    await queryRunner.createForeignKey(
      'auth_tokens',
      new ForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_auth_tokens_user',
      }),
    );

    // Refresh token to user relationship
    await queryRunner.createForeignKey(
      'refresh_tokens',
      new ForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_refresh_tokens_user',
      }),
    );
  }

  private async addForumConstraints(queryRunner: QueryRunner): Promise<void> {
    // Forum topic to user relationship
    await queryRunner.createForeignKey(
      'forum_topics',
      new ForeignKey({
        columnNames: ['authorId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_forum_topics_author',
      }),
    );

    // Forum topic to course relationship
    await queryRunner.createForeignKey(
      'forum_topics',
      new ForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'courses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_forum_topics_course',
      }),
    );

    // Forum post to topic relationship
    await queryRunner.createForeignKey(
      'forum_posts',
      new ForeignKey({
        columnNames: ['topicId'],
        referencedTableName: 'forum_topics',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_forum_posts_topic',
      }),
    );

    // Forum post to user relationship
    await queryRunner.createForeignKey(
      'forum_posts',
      new ForeignKey({
        columnNames: ['authorId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_forum_posts_author',
      }),
    );

    // Forum comment to post relationship
    await queryRunner.createForeignKey(
      'forum_comments',
      new ForeignKey({
        columnNames: ['postId'],
        referencedTableName: 'forum_posts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_forum_comments_post',
      }),
    );

    // Forum comment to user relationship
    await queryRunner.createForeignKey(
      'forum_comments',
      new ForeignKey({
        columnNames: ['authorId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_forum_comments_author',
      }),
    );
  }

  private async addNotificationConstraints(queryRunner: QueryRunner): Promise<void> {
    // Notification to user relationship
    await queryRunner.createForeignKey(
      'notifications',
      new ForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_notifications_user',
      }),
    );
  }

  // Rollback methods
  private async removeUserConstraints(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('users', 'FK_users_user_profile');
    await queryRunner.dropForeignKey('users', 'FK_users_user_settings');
    await queryRunner.dropForeignKey('users', 'FK_users_wallet_info');
  }

  private async removeCourseConstraints(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('courses', 'FK_courses_instructor');
    await queryRunner.dropForeignKey('courses', 'FK_courses_category');
    await queryRunner.dropForeignKey('course_enrollments', 'FK_course_enrollments_course');
    await queryRunner.dropForeignKey('course_enrollments', 'FK_course_enrollments_user');
  }

  private async removeCourseModuleConstraints(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('course_modules', 'FK_course_modules_course');
    await queryRunner.dropForeignKey('lessons', 'FK_lessons_module');
  }

  private async removeUserProgressConstraints(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('user_progress', 'FK_user_progress_user');
    await queryRunner.dropForeignKey('user_progress', 'FK_user_progress_course');
    await queryRunner.dropForeignKey('user_progress', 'FK_user_progress_lesson');
  }

  private async removeReviewConstraints(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('course_reviews', 'FK_course_reviews_user');
    await queryRunner.dropForeignKey('course_reviews', 'FK_course_reviews_course');
  }

  private async removeCertificateConstraints(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('certificates', 'FK_certificates_user');
    await queryRunner.dropForeignKey('certificates', 'FK_certificates_course');
  }

  private async removeAuthTokenConstraints(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('auth_tokens', 'FK_auth_tokens_user');
    await queryRunner.dropForeignKey('refresh_tokens', 'FK_refresh_tokens_user');
  }

  private async removeForumConstraints(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('forum_topics', 'FK_forum_topics_author');
    await queryRunner.dropForeignKey('forum_topics', 'FK_forum_topics_course');
    await queryRunner.dropForeignKey('forum_posts', 'FK_forum_posts_topic');
    await queryRunner.dropForeignKey('forum_posts', 'FK_forum_posts_author');
    await queryRunner.dropForeignKey('forum_comments', 'FK_forum_comments_post');
    await queryRunner.dropForeignKey('forum_comments', 'FK_forum_comments_author');
  }

  private async removeNotificationConstraints(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('notifications', 'FK_notifications_user');
  }
}
