# Database Schema Documentation - Optimized Version

## Overview

This document describes the **optimized database schema** for the StrellerMinds educational platform. The system uses PostgreSQL as the primary database with TypeORM for object-relational mapping. This version includes comprehensive foreign key constraints, optimized indexing, and improved data integrity measures.

## Schema Optimization Features

### ✅ **Implemented Optimizations**

- **Foreign Key Constraints**: Proper referential integrity with cascade behaviors
- **Strategic Indexing**: Performance-optimized indexes for common query patterns
- **Data Integrity**: Check constraints and validation rules
- **Soft Delete Support**: Comprehensive soft delete implementation
- **Audit Trail**: Complete audit fields across all entities
- **GDPR Compliance**: Data retention and deletion capabilities
- **Migration Rollback**: Safe migration rollback strategies

## Core Entities (Optimized)

### Users (Optimized)

The central entity representing platform users with enhanced constraints and indexing.

**Table**: `users`

| Column              | Type                | Constraints                           | Description                     | Indexes             |
| ------------------- | ------------------- | ------------------------------------- | ------------------------------- | ------------------- |
| id                  | UUID                | PRIMARY KEY                           | Unique user identifier          | PRIMARY             |
| firstName           | VARCHAR(100)        | NOT NULL, CHECK(LENGTH >= 1)          | User's first name               | -                   |
| lastName            | VARCHAR(100)        | NOT NULL, CHECK(LENGTH >= 1)          | User's last name                | -                   |
| email               | VARCHAR(255)        | UNIQUE, NOT NULL, CHECK(email format) | User's email address            | UNIQUE, GIN(search) |
| username            | VARCHAR(50)         | UNIQUE, NOT NULL                      | Unique username                 | UNIQUE, GIN(search) |
| password            | VARCHAR(255)        | NOT NULL, SELECT(false)               | Hashed password                 | -                   |
| isInstructor        | BOOLEAN             | DEFAULT false, NOT NULL               | Instructor status               | BTREE               |
| bio                 | VARCHAR(1000)       | NULLABLE                              | User biography                  | -                   |
| role                | ENUM(UserRole)      | DEFAULT 'STUDENT', NOT NULL           | User role                       | BTREE(role, status) |
| profileImageUrl     | VARCHAR(500)        | NULLABLE                              | Profile image URL               | -                   |
| preferredLanguage   | VARCHAR(10)         | DEFAULT 'en', NOT NULL                | Preferred language              | -                   |
| status              | ENUM(AccountStatus) | DEFAULT 'ACTIVE', NOT NULL            | Account status                  | BTREE(role, status) |
| isEmailVerified     | BOOLEAN             | DEFAULT false, NOT NULL               | Email verification status       | BTREE               |
| refreshToken        | VARCHAR(500)        | NULLABLE, SELECT(false)               | JWT refresh token               | -                   |
| createdAt           | TIMESTAMPTZ         | NOT NULL                              | Creation timestamp              | BTREE               |
| updatedAt           | TIMESTAMPTZ         | NOT NULL                              | Last update timestamp           | BTREE               |
| deletedAt           | TIMESTAMPTZ         | NULLABLE                              | Soft delete timestamp           | BTREE               |
| deactivatedAt       | TIMESTAMPTZ         | NULLABLE                              | GDPR deactivation timestamp     | BTREE               |
| deletionRequestedAt | TIMESTAMPTZ         | NULLABLE                              | GDPR deletion request timestamp | BTREE               |

**Optimized Indexes**:

- `IDX_users_email_unique` (UNIQUE) on `email`
- `IDX_users_username_unique` (UNIQUE) on `username`
- `IDX_users_role_status` (COMPOSITE) on `role, status`
- `IDX_users_instructor_active` (PARTIAL) on `isInstructor, status` WHERE `isInstructor = true AND status = 'ACTIVE'`
- `IDX_users_email_verified` on `isEmailVerified`
- `IDX_users_created_at` on `createdAt`
- `IDX_users_search_text` (GIN) on `to_tsvector('english', firstName || ' ' || lastName || ' ' || username)`

**Foreign Key Constraints**:

- `FK_users_user_profile` → `user_profiles(id)` ON DELETE CASCADE
- `FK_users_user_settings` → `user_settings(id)` ON DELETE CASCADE
- `FK_users_wallet_info` → `wallet_info(id)` ON DELETE CASCADE

### Courses (Optimized)

Educational courses with comprehensive constraints and performance optimizations.

**Table**: `courses`

| Column             | Type                  | Constraints                  | Description                 | Indexes            |
| ------------------ | --------------------- | ---------------------------- | --------------------------- | ------------------ |
| id                 | UUID                  | PRIMARY KEY                  | Unique course identifier    | PRIMARY            |
| title              | VARCHAR(200)          | NOT NULL, CHECK(LENGTH >= 3) | Course title                | BTREE, GIN(search) |
| description        | TEXT                  | NOT NULL                     | Course description          | GIN(search)        |
| thumbnailUrl       | VARCHAR(500)          | NULLABLE                     | Course thumbnail            | -                  |
| price              | DECIMAL(10,2)         | DEFAULT 0, CHECK(>= 0)       | Course price                | BTREE              |
| status             | ENUM(CourseStatus)    | DEFAULT 'DRAFT', NOT NULL    | Course status               | BTREE              |
| difficulty         | ENUM(DifficultyLevel) | DEFAULT 'BEGINNER', NOT NULL | Difficulty level            | BTREE              |
| estimatedDuration  | INTEGER               | NOT NULL, CHECK(> 0)         | Duration in minutes         | -                  |
| averageRating      | DECIMAL(3,2)          | DEFAULT 0, CHECK(0-5 range)  | Average rating              | BTREE              |
| totalRatings       | INTEGER               | DEFAULT 0, NOT NULL          | Total number of ratings     | -                  |
| enrollmentCount    | INTEGER               | DEFAULT 0, NOT NULL          | Number of enrolled students | BTREE              |
| isFeatured         | BOOLEAN               | DEFAULT false, NOT NULL      | Featured status             | BTREE              |
| language           | VARCHAR(10)           | DEFAULT 'en', NOT NULL       | Course language             | BTREE              |
| tags               | TEXT[]                | NULLABLE                     | Course tags                 | GIN                |
| learningObjectives | TEXT[]                | NULLABLE                     | Learning objectives         | -                  |
| prerequisites      | TEXT[]                | NULLABLE                     | Course prerequisites        | -                  |
| instructorId       | UUID                  | NOT NULL, FK                 | Instructor reference        | BTREE              |
| categoryId         | UUID                  | NULLABLE, FK                 | Category reference          | BTREE              |
| publishedAt        | TIMESTAMPTZ           | NULLABLE                     | Publication timestamp       | BTREE              |
| createdAt          | TIMESTAMPTZ           | NOT NULL                     | Creation timestamp          | BTREE              |
| updatedAt          | TIMESTAMPTZ           | NOT NULL                     | Last update timestamp       | BTREE              |
| deletedAt          | TIMESTAMPTZ           | NULLABLE                     | Soft delete timestamp       | BTREE              |

**Optimized Indexes**:

- `IDX_courses_title` on `title`
- `IDX_courses_instructor_id` on `instructorId`
- `IDX_courses_category_id` on `categoryId`
- `IDX_courses_status` on `status`
- `IDX_courses_difficulty` on `difficulty`
- `IDX_courses_published_at` on `publishedAt`
- `IDX_courses_rating` on `averageRating`
- `IDX_courses_enrollment_count` on `enrollmentCount`
- `IDX_courses_featured` on `isFeatured`
- `IDX_courses_price` on `price`
- `IDX_courses_free` (PARTIAL) on `price` WHERE `price = 0`
- `IDX_courses_language` on `language`
- `IDX_courses_tags_gin` (GIN) on `tags`
- `IDX_courses_search_text` (GIN) on `to_tsvector('english', title || ' ' || description)`
- `IDX_courses_instructor_status_published` (COMPOSITE) on `instructorId, status, publishedAt`
- `IDX_courses_popular` (PARTIAL) on `averageRating, enrollmentCount, status` WHERE `status = 'PUBLISHED' AND averageRating >= 4.0`

**Foreign Key Constraints**:

- `FK_courses_instructor` → `users(id)` ON DELETE CASCADE ON UPDATE CASCADE
- `FK_courses_category` → `categories(id)` ON DELETE SET NULL ON UPDATE CASCADE

## Enhanced Relationships with Foreign Key Constraints

### User Relationships (with FK Constraints)

- **One-to-Many**: User → Courses (as instructor) `FK_courses_instructor`
- **One-to-Many**: User → Course Reviews `FK_course_reviews_user`
- **One-to-Many**: User → Certificates `FK_certificates_user`
- **One-to-Many**: User → User Progress `FK_user_progress_user`
- **One-to-Many**: User → Auth Tokens `FK_auth_tokens_user`
- **One-to-One**: User → User Profile `FK_users_user_profile`
- **One-to-One**: User → User Settings `FK_users_user_settings`
- **One-to-One**: User → Wallet Info `FK_users_wallet_info`
- **Many-to-Many**: User ↔ Courses (enrollments) `FK_course_enrollments_user/course`

### Course Relationships (with FK Constraints)

- **Many-to-One**: Course → User (instructor) `FK_courses_instructor`
- **Many-to-One**: Course → Category `FK_courses_category`
- **One-to-Many**: Course → Course Modules `FK_course_modules_course`
- **One-to-Many**: Course → Course Reviews `FK_course_reviews_course`
- **One-to-Many**: Course → Certificates `FK_certificates_course`
- **One-to-Many**: Course → User Progress `FK_user_progress_course`

## Enhanced Enums

### UserRole

- `STUDENT`: Regular student user
- `INSTRUCTOR`: Course instructor
- `ADMIN`: Platform administrator

### AccountStatus

- `ACTIVE`: Active account
- `INACTIVE`: Inactive account
- `SUSPENDED`: Suspended account
- `DEACTIVATED`: GDPR deactivated account
- `PENDING_DELETION`: Marked for deletion
- `DELETED`: Soft deleted account

### CourseStatus

- `DRAFT`: Course in draft state
- `PUBLISHED`: Published course
- `ARCHIVED`: Archived course
- `SUSPENDED`: Suspended course

### DifficultyLevel

- `BEGINNER`: Beginner level
- `INTERMEDIATE`: Intermediate level
- `ADVANCED`: Advanced level

### LessonType

- `VIDEO`: Video lesson
- `TEXT`: Text-based lesson
- `QUIZ`: Quiz lesson
- `ASSIGNMENT`: Assignment lesson
- `INTERACTIVE`: Interactive lesson

## Advanced Constraints and Validations

### Data Integrity Constraints

- **Foreign Key Constraints**: All relationships have proper CASCADE/SET NULL behaviors
- **Unique Constraints**: Email, username uniqueness with proper indexes
- **Check Constraints**: Data validation (positive prices, valid ratings, name lengths)
- **Not Null Constraints**: Required fields properly enforced
- **Default Values**: Sensible defaults for optional fields

### Business Logic Constraints

- Users can only review courses they're enrolled in (enforced by unique constraint)
- Instructors can only modify their own courses (application-level)
- Course modules must belong to a valid course (FK constraint)
- Lessons must belong to a valid module (FK constraint)
- Email format validation (CHECK constraint)
- Rating range validation (0-5 range CHECK constraint)

## Performance Optimization Strategy

### Strategic Indexing

- **Primary Keys**: Automatically indexed (UUID with good distribution)
- **Foreign Keys**: Dedicated indexes on all FK columns
- **Query Patterns**: Indexes based on common query patterns
- **Composite Indexes**: Multi-column indexes for complex queries
- **Partial Indexes**: Conditional indexes for specific use cases
- **GIN Indexes**: Full-text search and array operations
- **Unique Indexes**: Constraint enforcement with performance benefits

### Query Optimization Features

- **Proper Data Types**: Optimal storage and comparison performance
- **Strategic Normalization**: Balanced approach to reduce redundancy
- **Denormalization**: Calculated fields (averageRating, enrollmentCount) for performance
- **Pagination Support**: Efficient LIMIT/OFFSET with proper ordering
- **Search Optimization**: Full-text search indexes with language support

## Security and Compliance

### Data Protection

- **Password Security**: bcrypt hashing with salt rounds
- **Sensitive Field Protection**: SELECT(false) for passwords and tokens
- **Soft Delete Implementation**: Comprehensive soft delete across all entities
- **GDPR Compliance**: Data retention, deactivation, and deletion capabilities
- **Audit Trail**: Complete timestamp tracking (created, updated, deleted)

### Access Control

- **Role-Based Access Control**: Comprehensive RBAC implementation
- **Entity-Level Permissions**: Fine-grained access control
- **Audit Logging**: Track all sensitive operations
- **Data Anonymization**: Support for user data anonymization

## Migration Strategy (Enhanced)

### Safe Migration Approach

- **Rollback Support**: Every migration has a proper down() method
- **Data Safety**: Backup creation before destructive operations
- **Validation**: Pre-migration validation and conflict detection
- **Incremental Changes**: Small, focused migrations
- **Testing**: Migration testing in staging environments

### Migration Management

- **Version Control**: All schema changes tracked through migrations
- **Automated Rollback**: Safe rollback with data integrity checks
- **Backup Integration**: Automatic backup creation and restoration
- **Conflict Resolution**: Detection and resolution of migration conflicts
- **Performance Impact**: Analysis of migration performance impact

## Database Commands

### Running Migrations

```bash
# Run all pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Generate new migration
npm run migration:generate -- -n MigrationName

# Create empty migration
npm run migration:create -- -n MigrationName
```

### Schema Analysis

```bash
# Analyze current schema
node scripts/schema-analysis.js

# Validate migrations
npm run migration:validate

# Check migration status
npm run migration:show
```

### Performance Optimization

```bash
# Optimize indexes
npm run db:optimize-indexes

# Analyze query performance
npm run db:analyze-performance

# Update table statistics
npm run db:update-stats
```

## Monitoring and Maintenance

### Performance Monitoring

- **Query Performance**: Track slow queries and optimization opportunities
- **Index Usage**: Monitor index effectiveness and unused indexes
- **Connection Pool**: Monitor database connection usage
- **Lock Analysis**: Detect and resolve database locks

### Data Quality

- **Integrity Checks**: Regular foreign key and constraint validation
- **Orphaned Records**: Automated cleanup of orphaned data
- **Statistics Updates**: Keep query planner statistics current
- **Backup Verification**: Regular backup integrity checks

## Best Practices

### Development

1. **Always use migrations** for schema changes
2. **Test migrations** in staging before production
3. **Create backups** before major changes
4. **Use proper indexes** for query optimization
5. **Follow naming conventions** for consistency

### Production

1. **Monitor performance** continuously
2. **Regular maintenance** tasks (VACUUM, ANALYZE)
3. **Backup strategy** with point-in-time recovery
4. **Security updates** and patches
5. **Capacity planning** based on growth metrics

---

_This optimized schema provides a robust foundation for the StrellerMinds educational platform with enhanced performance, security, and maintainability._
