# Database Manager TypeScript Guide

## Overview

The `db-manager.ts` script has been converted from JavaScript to TypeScript with enhanced features, better error handling, and a standardized migration template system.

## Key Improvements

### 1. TypeScript Conversion
- **Full TypeScript support** with proper type definitions
- **Interface definitions** for configuration, backups, and health checks
- **Enum-based error codes** for consistent error handling
- **JSDoc documentation** for all public methods

### 2. Enhanced Migration Template
- **Transactional safety guards** in all migrations
- **Automatic rollback support** with proper error handling
- **Standardized structure** with up/down methods
- **Performance considerations** and best practices
- **Comprehensive documentation** in generated migrations

### 3. Improved Error Handling
- **Consistent error codes** using enum values
- **Detailed error messages** with context
- **Proper error propagation** and cleanup
- **Graceful failure handling** with meaningful feedback

### 4. Better Logging and Monitoring
- **Structured logging** with emojis for better readability
- **Progress indicators** for long-running operations
- **Health check metrics** with detailed database statistics
- **Performance monitoring** for optimization operations

## Usage

### Prerequisites
- Node.js with TypeScript support
- ts-node installed globally or locally
- PostgreSQL database access
- Proper environment variables configured

### Environment Variables
```bash
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=streller_minds
NODE_ENV=development
```

### Available Commands

#### Migration Management
```bash
# Run pending migrations
npm run db:migrate

# Revert last migration
npm run db:revert

# Check migration status
npm run db:status

# Generate new migration
npm run db:generate -- AddUserPreferences
npm run db:generate -- AddUserPreferences -d "Add user preference settings table"
```

#### Database Operations
```bash
# Validate database schema
npm run db:validate

# Optimize database performance
npm run db:optimize

# Check database health
npm run db:health
```

#### Backup and Restore
```bash
# Create backup
npm run db:backup
npm run db:backup -- -f my-backup.sql

# Restore from backup
npm run db:restore -- /path/to/backup.sql
```

## Migration Template Features

### Standardized Structure
Every generated migration includes:
- **Transactional safety** with automatic rollback on errors
- **Proper error handling** with detailed logging
- **JSDoc documentation** for maintainability
- **Template placeholders** for easy customization

### Example Generated Migration
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: 1703002000000-AddUserPreferences
 * Description: Add user preference settings table
 * Author: developer
 * Date: 2023-12-19T10:00:00.000Z
 *
 * This migration includes:
 * - Transactional safety guards
 * - Proper error handling
 * - Rollback support
 * - Performance considerations
 */
export class AddUserPreferences1703002000000 implements MigrationInterface {
  name = 'AddUserPreferences1703002000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();

    try {
      // TODO: Implement your migration logic here
      await queryRunner.query(`CREATE TABLE user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        theme VARCHAR(20) DEFAULT 'light',
        language VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      await queryRunner.commitTransaction();
      console.log('✅ Migration AddUserPreferences1703002000000 completed successfully');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Migration AddUserPreferences1703002000000 failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();

    try {
      // TODO: Implement your rollback logic here
      await queryRunner.query('DROP TABLE IF EXISTS user_preferences');

      await queryRunner.commitTransaction();
      console.log('✅ Migration AddUserPreferences1703002000000 rolled back successfully');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Migration AddUserPreferences1703002000000 rollback failed:', error);
      throw error;
    }
  }
}
```

## Error Codes

The system uses standardized error codes for consistent error handling:

- `DB_CONNECTION_FAILED` - Database connection issues
- `MIGRATION_FAILED` - Migration execution failures
- `MIGRATION_REVERT_FAILED` - Migration rollback failures
- `SCHEMA_VALIDATION_FAILED` - Schema validation issues
- `DB_OPTIMIZATION_FAILED` - Database optimization failures
- `BACKUP_CREATION_FAILED` - Backup creation issues
- `BACKUP_RESTORE_FAILED` - Backup restoration issues
- `HEALTH_CHECK_FAILED` - Health check failures
- `MIGRATION_GENERATION_FAILED` - Migration generation issues
- `FILE_OPERATION_FAILED` - File system operation failures
- `INVALID_INPUT` - Invalid input parameters

## Development Workflow

### 1. Creating Migrations
```bash
# Generate a new migration
npm run db:generate -- CreateUserTable -d "Create users table with authentication fields"

# Edit the generated migration file
# src/database/migrations/[timestamp]-CreateUserTable.ts

# Run the migration
npm run db:migrate
```

### 2. Testing Migrations
```bash
# Check migration status
npm run db:status

# Test rollback (if needed)
npm run db:revert

# Re-run migration
npm run db:migrate
```

### 3. Database Maintenance
```bash
# Regular health checks
npm run db:health

# Performance optimization
npm run db:optimize

# Schema validation
npm run db:validate
```

## Best Practices

### Migration Development
1. **Always test migrations** in development environment first
2. **Use transactions** for data safety (automatically included in template)
3. **Implement proper rollback logic** in the down method
4. **Add indexes** for performance-critical queries
5. **Use descriptive names** for migrations and tables

### Error Handling
1. **Check error codes** for specific failure types
2. **Review logs** for detailed error information
3. **Use health checks** before critical operations
4. **Create backups** before major schema changes

### Performance Considerations
1. **Run optimization** after major schema changes
2. **Monitor database health** regularly
3. **Use proper indexing** for frequently queried fields
4. **Consider data migration** for large datasets

## Troubleshooting

### Common Issues

#### Connection Problems
```bash
# Check database health
npm run db:health

# Verify environment variables
echo $DATABASE_HOST
echo $DATABASE_PORT
```

#### Migration Failures
```bash
# Check migration status
npm run db:status

# Review recent migrations
ls -la src/database/migrations/

# Rollback if needed
npm run db:revert
```

#### Performance Issues
```bash
# Run database optimization
npm run db:optimize

# Check for long-running queries
npm run db:health
```

## Integration with CI/CD

The TypeScript db-manager can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Database Migrations
  run: npm run db:migrate
  env:
    DATABASE_HOST: ${{ secrets.DATABASE_HOST }}
    DATABASE_PORT: ${{ secrets.DATABASE_PORT }}
    DATABASE_USER: ${{ secrets.DATABASE_USER }}
    DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
    DATABASE_NAME: ${{ secrets.DATABASE_NAME }}
```

## Migration from JavaScript Version

The old `db-manager.js` file can be safely removed after confirming the TypeScript version works correctly:

```bash
# Test the new TypeScript version
npm run db:health
npm run db:status

# Remove old JavaScript file (after testing)
rm scripts/db-manager.js
```

## Support and Maintenance

For issues or questions:
1. Check the error codes and logs
2. Review the migration template documentation
3. Consult the database schema documentation
4. Test in development environment first

The TypeScript version provides better error handling, type safety, and maintainability compared to the original JavaScript implementation.
