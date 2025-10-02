# Database Schema Documentation

## Overview

This document outlines the database schema for the StrellerMinds Backend application. The application uses PostgreSQL as its database and TypeORM as the Object-Relational Mapping (ORM) tool.

## Database Configuration

The database connection is configured using environment variables:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_NAME=streller_minds
```

## Entity Relationships

### User Management

#### User Profiles

- **Table**: `user_profiles`
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `firstName` (varchar, nullable)
  - `lastName` (varchar, nullable)
- **Relationships**:
  - One-to-One with User entity

#### User Settings

- **Table**: `user_settings`
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `darkModeEnabled` (boolean, default: true)
  - `newsletterSubscribed` (boolean, default: false)
  - `preferredLanguage` (varchar, default: 'en')
  - `createdAt` (timestamp)
- **Relationships**:
  - One-to-One with User entity

### Course Management

#### Courses

- **Table**: `courses`
- **Primary Key**: `id` (UUID)
- **Relationships**:
  - Many-to-One with Category
  - One-to-Many with Modules
  - One-to-Many with CourseReviews

#### Course Reviews

- **Table**: `course_reviews`
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `rating` (integer, default: 5)
  - `comment` (text, nullable)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
- **Relationships**:
  - Many-to-One with User
  - Many-to-One with Course
- **Indexes**: User ID

#### Categories

- **Table**: `categories`
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `name` (varchar(100), unique)
  - `description` (text, nullable)
  - `icon` (varchar, nullable)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
- **Relationships**:
  - One-to-Many with Courses

### Mentorship System

#### Mentorship Matches

- **Table**: `mentorship_matches`
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `mentorId` (UUID)
  - `menteeId` (UUID)
  - `status` (enum: PENDING, ACCEPTED, DECLINED, COMPLETED, CANCELED)
  - `type` (enum: AUTOMATIC, MANUAL)
- **Relationships**:
  - Many-to-One with User (mentor)
  - Many-to-One with User (mentee)

#### Mentorship Preferences

- **Table**: `mentorship_preferences`
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `userId` (UUID)
  - `role` (enum: MENTOR, MENTEE)
  - `skills` (array)
- **Relationships**:
  - Many-to-One with User

### Communication

#### Email Templates

- **Table**: `email_templates`
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `name` (varchar, unique)
  - `subject` (varchar)
  - `content` (text)
  - `description` (varchar, nullable)
  - `isActive` (boolean, default: true)
  - `createdAt` (timestamp)

#### Email Logs

- **Table**: `email_logs`
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `recipient` (varchar, indexed)
  - `subject` (varchar)
  - `templateName` (varchar, indexed)
  - `createdAt` (timestamp)

#### Email Preferences

- **Table**: `email_preferences`
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `email` (varchar, indexed)
  - `emailType` (enum: AUTHENTICATION, MARKETING, COURSE_UPDATES, FORUM_NOTIFICATIONS, SYSTEM_NOTIFICATIONS)
- **Constraints**: Unique combination of email and emailType

### Forum System

#### Forum Categories

- **Table**: `forum_categories`
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `name` (varchar(100))
  - `description` (text, nullable)
  - `order` (integer, default: 0)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
- **Relationships**:
  - One-to-Many with Forum Topics

#### Forum Posts

- **Table**: `forum_posts`
- **Primary Key**: `id` (UUID)
- **Indexes**: Full-text search on content
- **Relationships**:
  - Many-to-One with Forum Topic
  - One-to-Many with Forum Comments
  - Many-to-One with User

## Common Features

### Rate Limiting

- **Table**: `rate_limiter`
- **Primary Key**: `key` (varchar)
- **Fields**:
  - `points` (integer)
  - `expire` (timestamp)

### Authentication

- **Table**: `auth_tokens`
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `token` (varchar(500))
  - `expiresAt` (timestamp)
  - `isRevoked` (boolean, default: false)

## Design Decisions

1. **UUID Usage**: All entities use UUID as primary keys for better distribution and security.
2. **Timestamps**: Most entities include `createdAt` and `updatedAt` timestamps for audit purposes.
3. **Soft Deletes**: Implemented where data retention is important.
4. **Indexing Strategy**: Indexes are added on frequently queried fields and foreign keys.
5. **Enum Types**: Used for fields with predefined values to ensure data consistency.

## Security Considerations

1. Sensitive data is stored in separate tables
2. Password hashing is implemented at the application level
3. Rate limiting is implemented to prevent abuse
4. Token-based authentication with expiration

## Performance Optimization

1. Appropriate indexes are created for frequently queried fields
2. Full-text search capabilities for forum posts
3. Efficient relationship mappings to prevent N+1 query problems
