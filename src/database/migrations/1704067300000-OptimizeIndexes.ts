import { MigrationInterface, QueryRunner, Index } from 'typeorm';

/**
 * Migration to optimize database indexing for better query performance
 * This migration adds strategic indexes based on common query patterns
 */
export class OptimizeIndexes1704067300000 implements MigrationInterface {
  name = 'OptimizeIndexes1704067300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('📊 Optimizing database indexes...');

    // Users table indexes
    await this.createUserIndexes(queryRunner);

    // Courses table indexes
    await this.createCourseIndexes(queryRunner);

    // Course modules and lessons indexes
    await this.createModuleIndexes(queryRunner);

    // User progress indexes
    await this.createProgressIndexes(queryRunner);

    // Reviews and ratings indexes
    await this.createReviewIndexes(queryRunner);

    // Authentication indexes
    await this.createAuthIndexes(queryRunner);

    // Forum indexes
    await this.createForumIndexes(queryRunner);

    // Notification indexes
    await this.createNotificationIndexes(queryRunner);

    // Composite indexes for complex queries
    await this.createCompositeIndexes(queryRunner);

    // Full-text search indexes
    await this.createSearchIndexes(queryRunner);

    console.log('✅ Database indexes optimized successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Removing optimized indexes...');

    // Remove indexes in reverse order
    await this.dropSearchIndexes(queryRunner);
    await this.dropCompositeIndexes(queryRunner);
    await this.dropNotificationIndexes(queryRunner);
    await this.dropForumIndexes(queryRunner);
    await this.dropAuthIndexes(queryRunner);
    await this.dropReviewIndexes(queryRunner);
    await this.dropProgressIndexes(queryRunner);
    await this.dropModuleIndexes(queryRunner);
    await this.dropCourseIndexes(queryRunner);
    await this.dropUserIndexes(queryRunner);

    console.log('✅ Optimized indexes removed successfully');
  }

  private async createUserIndexes(queryRunner: QueryRunner): Promise<void> {
    // Primary lookup indexes
    await queryRunner.createIndex(
      'users',
      new Index('IDX_users_email_unique', ['email'], { unique: true }),
    );
    await queryRunner.createIndex(
      'users',
      new Index('IDX_users_username_unique', ['username'], { unique: true }),
    );

    // Query optimization indexes
    await queryRunner.createIndex('users', new Index('IDX_users_role_status', ['role', 'status']));
    await queryRunner.createIndex(
      'users',
      new Index('IDX_users_instructor_active', ['isInstructor', 'status'], {
        where: "isInstructor = true AND status = 'ACTIVE'",
      }),
    );
    await queryRunner.createIndex(
      'users',
      new Index('IDX_users_email_verified', ['isEmailVerified']),
    );

    // Audit and soft delete indexes
    await queryRunner.createIndex('users', new Index('IDX_users_created_at', ['createdAt']));
    await queryRunner.createIndex('users', new Index('IDX_users_updated_at', ['updatedAt']));
    await queryRunner.createIndex('users', new Index('IDX_users_deleted_at', ['deletedAt']));

    // GDPR compliance indexes
    await queryRunner.createIndex(
      'users',
      new Index('IDX_users_deactivated_at', ['deactivatedAt']),
    );
    await queryRunner.createIndex(
      'users',
      new Index('IDX_users_deletion_requested', ['deletionRequestedAt']),
    );
  }

  private async createCourseIndexes(queryRunner: QueryRunner): Promise<void> {
    // Primary lookup indexes
    await queryRunner.createIndex('courses', new Index('IDX_courses_title', ['title']));
    await queryRunner.createIndex(
      'courses',
      new Index('IDX_courses_instructor_id', ['instructorId']),
    );
    await queryRunner.createIndex('courses', new Index('IDX_courses_category_id', ['categoryId']));

    // Status and filtering indexes
    await queryRunner.createIndex('courses', new Index('IDX_courses_status', ['status']));
    await queryRunner.createIndex('courses', new Index('IDX_courses_difficulty', ['difficulty']));
    await queryRunner.createIndex(
      'courses',
      new Index('IDX_courses_published_at', ['publishedAt']),
    );

    // Performance and popularity indexes
    await queryRunner.createIndex('courses', new Index('IDX_courses_rating', ['averageRating']));
    await queryRunner.createIndex(
      'courses',
      new Index('IDX_courses_enrollment_count', ['enrollmentCount']),
    );
    await queryRunner.createIndex('courses', new Index('IDX_courses_featured', ['isFeatured']));

    // Pricing indexes
    await queryRunner.createIndex('courses', new Index('IDX_courses_price', ['price']));
    await queryRunner.createIndex(
      'courses',
      new Index('IDX_courses_free', ['price'], {
        where: 'price = 0',
      }),
    );

    // Language and tags indexes
    await queryRunner.createIndex('courses', new Index('IDX_courses_language', ['language']));

    // Audit indexes
    await queryRunner.createIndex('courses', new Index('IDX_courses_created_at', ['createdAt']));
    await queryRunner.createIndex('courses', new Index('IDX_courses_updated_at', ['updatedAt']));
    await queryRunner.createIndex('courses', new Index('IDX_courses_deleted_at', ['deletedAt']));
  }

  private async createModuleIndexes(queryRunner: QueryRunner): Promise<void> {
    // Course module indexes
    await queryRunner.createIndex(
      'course_modules',
      new Index('IDX_course_modules_course_id', ['courseId']),
    );
    await queryRunner.createIndex(
      'course_modules',
      new Index('IDX_course_modules_order', ['courseId', 'orderIndex']),
    );
    await queryRunner.createIndex(
      'course_modules',
      new Index('IDX_course_modules_created_at', ['createdAt']),
    );

    // Lesson indexes
    await queryRunner.createIndex('lessons', new Index('IDX_lessons_module_id', ['moduleId']));
    await queryRunner.createIndex(
      'lessons',
      new Index('IDX_lessons_order', ['moduleId', 'orderIndex']),
    );
    await queryRunner.createIndex('lessons', new Index('IDX_lessons_type', ['type']));
    await queryRunner.createIndex('lessons', new Index('IDX_lessons_duration', ['duration']));
    await queryRunner.createIndex('lessons', new Index('IDX_lessons_created_at', ['createdAt']));
  }

  private async createProgressIndexes(queryRunner: QueryRunner): Promise<void> {
    // User progress indexes
    await queryRunner.createIndex(
      'user_progress',
      new Index('IDX_user_progress_user_id', ['userId']),
    );
    await queryRunner.createIndex(
      'user_progress',
      new Index('IDX_user_progress_course_id', ['courseId']),
    );
    await queryRunner.createIndex(
      'user_progress',
      new Index('IDX_user_progress_lesson_id', ['lessonId']),
    );

    // Progress tracking indexes
    await queryRunner.createIndex(
      'user_progress',
      new Index('IDX_user_progress_completed', ['isCompleted']),
    );
    await queryRunner.createIndex(
      'user_progress',
      new Index('IDX_user_progress_completion_date', ['completedAt']),
    );
    await queryRunner.createIndex(
      'user_progress',
      new Index('IDX_user_progress_updated_at', ['updatedAt']),
    );

    // Course enrollment indexes
    await queryRunner.createIndex(
      'course_enrollments',
      new Index('IDX_course_enrollments_user_course', ['userId', 'courseId'], { unique: true }),
    );
    await queryRunner.createIndex(
      'course_enrollments',
      new Index('IDX_course_enrollments_enrolled_at', ['enrolledAt']),
    );
  }

  private async createReviewIndexes(queryRunner: QueryRunner): Promise<void> {
    // Course review indexes
    await queryRunner.createIndex(
      'course_reviews',
      new Index('IDX_course_reviews_course_id', ['courseId']),
    );
    await queryRunner.createIndex(
      'course_reviews',
      new Index('IDX_course_reviews_user_id', ['userId']),
    );
    await queryRunner.createIndex(
      'course_reviews',
      new Index('IDX_course_reviews_rating', ['rating']),
    );
    await queryRunner.createIndex(
      'course_reviews',
      new Index('IDX_course_reviews_created_at', ['createdAt']),
    );

    // Unique constraint for one review per user per course
    await queryRunner.createIndex(
      'course_reviews',
      new Index('IDX_course_reviews_user_course_unique', ['userId', 'courseId'], { unique: true }),
    );
  }

  private async createAuthIndexes(queryRunner: QueryRunner): Promise<void> {
    // Auth token indexes
    await queryRunner.createIndex('auth_tokens', new Index('IDX_auth_tokens_user_id', ['userId']));
    await queryRunner.createIndex(
      'auth_tokens',
      new Index('IDX_auth_tokens_token', ['token'], { unique: true }),
    );
    await queryRunner.createIndex(
      'auth_tokens',
      new Index('IDX_auth_tokens_expires_at', ['expiresAt']),
    );
    await queryRunner.createIndex('auth_tokens', new Index('IDX_auth_tokens_type', ['type']));

    // Refresh token indexes
    await queryRunner.createIndex(
      'refresh_tokens',
      new Index('IDX_refresh_tokens_user_id', ['userId']),
    );
    await queryRunner.createIndex(
      'refresh_tokens',
      new Index('IDX_refresh_tokens_token', ['token'], { unique: true }),
    );
    await queryRunner.createIndex(
      'refresh_tokens',
      new Index('IDX_refresh_tokens_expires_at', ['expiresAt']),
    );
  }

  private async createForumIndexes(queryRunner: QueryRunner): Promise<void> {
    // Forum topic indexes
    await queryRunner.createIndex(
      'forum_topics',
      new Index('IDX_forum_topics_course_id', ['courseId']),
    );
    await queryRunner.createIndex(
      'forum_topics',
      new Index('IDX_forum_topics_author_id', ['authorId']),
    );
    await queryRunner.createIndex(
      'forum_topics',
      new Index('IDX_forum_topics_created_at', ['createdAt']),
    );
    await queryRunner.createIndex(
      'forum_topics',
      new Index('IDX_forum_topics_updated_at', ['updatedAt']),
    );

    // Forum post indexes
    await queryRunner.createIndex(
      'forum_posts',
      new Index('IDX_forum_posts_topic_id', ['topicId']),
    );
    await queryRunner.createIndex(
      'forum_posts',
      new Index('IDX_forum_posts_author_id', ['authorId']),
    );
    await queryRunner.createIndex(
      'forum_posts',
      new Index('IDX_forum_posts_created_at', ['createdAt']),
    );

    // Forum comment indexes
    await queryRunner.createIndex(
      'forum_comments',
      new Index('IDX_forum_comments_post_id', ['postId']),
    );
    await queryRunner.createIndex(
      'forum_comments',
      new Index('IDX_forum_comments_author_id', ['authorId']),
    );
    await queryRunner.createIndex(
      'forum_comments',
      new Index('IDX_forum_comments_created_at', ['createdAt']),
    );
  }

  private async createNotificationIndexes(queryRunner: QueryRunner): Promise<void> {
    // Notification indexes
    await queryRunner.createIndex(
      'notifications',
      new Index('IDX_notifications_user_id', ['userId']),
    );
    await queryRunner.createIndex('notifications', new Index('IDX_notifications_type', ['type']));
    await queryRunner.createIndex('notifications', new Index('IDX_notifications_read', ['isRead']));
    await queryRunner.createIndex(
      'notifications',
      new Index('IDX_notifications_created_at', ['createdAt']),
    );

    // Unread notifications index
    await queryRunner.createIndex(
      'notifications',
      new Index('IDX_notifications_unread', ['userId', 'isRead'], {
        where: 'isRead = false',
      }),
    );
  }

  private async createCompositeIndexes(queryRunner: QueryRunner): Promise<void> {
    // Complex query optimization indexes

    // Active instructors with published courses
    await queryRunner.createIndex(
      'courses',
      new Index(
        'IDX_courses_instructor_status_published',
        ['instructorId', 'status', 'publishedAt'],
        {
          where: "status = 'PUBLISHED' AND publishedAt IS NOT NULL",
        },
      ),
    );

    // Popular courses (high rating and enrollment)
    await queryRunner.createIndex(
      'courses',
      new Index('IDX_courses_popular', ['averageRating', 'enrollmentCount', 'status'], {
        where: "status = 'PUBLISHED' AND averageRating >= 4.0 AND enrollmentCount > 50",
      }),
    );

    // User course progress tracking
    await queryRunner.createIndex(
      'user_progress',
      new Index('IDX_user_progress_tracking', ['userId', 'courseId', 'isCompleted', 'updatedAt']),
    );

    // Recent course activity
    await queryRunner.createIndex(
      'courses',
      new Index('IDX_courses_recent_activity', ['status', 'updatedAt'], {
        where: "status = 'PUBLISHED'",
      }),
    );

    // User engagement metrics
    await queryRunner.createIndex(
      'course_reviews',
      new Index('IDX_course_reviews_engagement', ['courseId', 'rating', 'createdAt']),
    );
  }

  private async createSearchIndexes(queryRunner: QueryRunner): Promise<void> {
    // Full-text search indexes for PostgreSQL

    // Course search index
    await queryRunner.query(`
      CREATE INDEX IDX_courses_search_text ON courses 
      USING gin(to_tsvector('english', title || ' ' || description))
    `);

    // User search index
    await queryRunner.query(`
      CREATE INDEX IDX_users_search_text ON users 
      USING gin(to_tsvector('english', "firstName" || ' ' || "lastName" || ' ' || username))
    `);

    // Forum search index
    await queryRunner.query(`
      CREATE INDEX IDX_forum_topics_search_text ON forum_topics 
      USING gin(to_tsvector('english', title || ' ' || content))
    `);

    // Course tags search (GIN index for array operations)
    await queryRunner.query(`
      CREATE INDEX IDX_courses_tags_gin ON courses USING gin(tags)
    `);
  }

  // Rollback methods
  private async dropUserIndexes(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'IDX_users_email_unique',
      'IDX_users_username_unique',
      'IDX_users_role_status',
      'IDX_users_instructor_active',
      'IDX_users_email_verified',
      'IDX_users_created_at',
      'IDX_users_updated_at',
      'IDX_users_deleted_at',
      'IDX_users_deactivated_at',
      'IDX_users_deletion_requested',
    ];

    for (const indexName of indexes) {
      await queryRunner.dropIndex('users', indexName);
    }
  }

  private async dropCourseIndexes(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'IDX_courses_title',
      'IDX_courses_instructor_id',
      'IDX_courses_category_id',
      'IDX_courses_status',
      'IDX_courses_difficulty',
      'IDX_courses_published_at',
      'IDX_courses_rating',
      'IDX_courses_enrollment_count',
      'IDX_courses_featured',
      'IDX_courses_price',
      'IDX_courses_free',
      'IDX_courses_language',
      'IDX_courses_created_at',
      'IDX_courses_updated_at',
      'IDX_courses_deleted_at',
    ];

    for (const indexName of indexes) {
      await queryRunner.dropIndex('courses', indexName);
    }
  }

  private async dropModuleIndexes(queryRunner: QueryRunner): Promise<void> {
    const moduleIndexes = [
      'IDX_course_modules_course_id',
      'IDX_course_modules_order',
      'IDX_course_modules_created_at',
    ];

    const lessonIndexes = [
      'IDX_lessons_module_id',
      'IDX_lessons_order',
      'IDX_lessons_type',
      'IDX_lessons_duration',
      'IDX_lessons_created_at',
    ];

    for (const indexName of moduleIndexes) {
      await queryRunner.dropIndex('course_modules', indexName);
    }

    for (const indexName of lessonIndexes) {
      await queryRunner.dropIndex('lessons', indexName);
    }
  }

  private async dropProgressIndexes(queryRunner: QueryRunner): Promise<void> {
    const progressIndexes = [
      'IDX_user_progress_user_id',
      'IDX_user_progress_course_id',
      'IDX_user_progress_lesson_id',
      'IDX_user_progress_completed',
      'IDX_user_progress_completion_date',
      'IDX_user_progress_updated_at',
    ];

    const enrollmentIndexes = [
      'IDX_course_enrollments_user_course',
      'IDX_course_enrollments_enrolled_at',
    ];

    for (const indexName of progressIndexes) {
      await queryRunner.dropIndex('user_progress', indexName);
    }

    for (const indexName of enrollmentIndexes) {
      await queryRunner.dropIndex('course_enrollments', indexName);
    }
  }

  private async dropReviewIndexes(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'IDX_course_reviews_course_id',
      'IDX_course_reviews_user_id',
      'IDX_course_reviews_rating',
      'IDX_course_reviews_created_at',
      'IDX_course_reviews_user_course_unique',
    ];

    for (const indexName of indexes) {
      await queryRunner.dropIndex('course_reviews', indexName);
    }
  }

  private async dropAuthIndexes(queryRunner: QueryRunner): Promise<void> {
    const authTokenIndexes = [
      'IDX_auth_tokens_user_id',
      'IDX_auth_tokens_token',
      'IDX_auth_tokens_expires_at',
      'IDX_auth_tokens_type',
    ];

    const refreshTokenIndexes = [
      'IDX_refresh_tokens_user_id',
      'IDX_refresh_tokens_token',
      'IDX_refresh_tokens_expires_at',
    ];

    for (const indexName of authTokenIndexes) {
      await queryRunner.dropIndex('auth_tokens', indexName);
    }

    for (const indexName of refreshTokenIndexes) {
      await queryRunner.dropIndex('refresh_tokens', indexName);
    }
  }

  private async dropForumIndexes(queryRunner: QueryRunner): Promise<void> {
    const topicIndexes = [
      'IDX_forum_topics_course_id',
      'IDX_forum_topics_author_id',
      'IDX_forum_topics_created_at',
      'IDX_forum_topics_updated_at',
    ];

    const postIndexes = [
      'IDX_forum_posts_topic_id',
      'IDX_forum_posts_author_id',
      'IDX_forum_posts_created_at',
    ];

    const commentIndexes = [
      'IDX_forum_comments_post_id',
      'IDX_forum_comments_author_id',
      'IDX_forum_comments_created_at',
    ];

    for (const indexName of topicIndexes) {
      await queryRunner.dropIndex('forum_topics', indexName);
    }

    for (const indexName of postIndexes) {
      await queryRunner.dropIndex('forum_posts', indexName);
    }

    for (const indexName of commentIndexes) {
      await queryRunner.dropIndex('forum_comments', indexName);
    }
  }

  private async dropNotificationIndexes(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'IDX_notifications_user_id',
      'IDX_notifications_type',
      'IDX_notifications_read',
      'IDX_notifications_created_at',
      'IDX_notifications_unread',
    ];

    for (const indexName of indexes) {
      await queryRunner.dropIndex('notifications', indexName);
    }
  }

  private async dropCompositeIndexes(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'IDX_courses_instructor_status_published',
      'IDX_courses_popular',
      'IDX_user_progress_tracking',
      'IDX_courses_recent_activity',
      'IDX_course_reviews_engagement',
    ];

    for (const indexName of indexes) {
      try {
        await queryRunner.dropIndex('courses', indexName);
      } catch (error) {
        // Index might be on different table
        try {
          await queryRunner.dropIndex('user_progress', indexName);
        } catch (error2) {
          try {
            await queryRunner.dropIndex('course_reviews', indexName);
          } catch (error3) {
            // Index doesn't exist, continue
          }
        }
      }
    }
  }

  private async dropSearchIndexes(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS IDX_courses_search_text');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_users_search_text');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_forum_topics_search_text');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_courses_tags_gin');
  }
}
